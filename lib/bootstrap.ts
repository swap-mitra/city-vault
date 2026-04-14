import type { Prisma } from "@prisma/client";

const defaultWorkspaceName = "General Records";
const defaultWorkspaceSlug = "general-records";

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "city-vault";
}

async function getUniqueOrganizationSlug(
  tx: Prisma.TransactionClient,
  baseName: string
) {
  const baseSlug = slugify(baseName);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function bootstrapInitialOrganizationForUser(
  tx: Prisma.TransactionClient,
  user: { id: string; name: string | null; email: string }
) {
  const organizationCount = await tx.organization.count();

  if (organizationCount > 0) {
    return null;
  }

  const baseName = user.name?.trim() || user.email.split("@")[0] || "City Vault";
  const organizationName = `${baseName} Records`;
  const organizationSlug = await getUniqueOrganizationSlug(tx, organizationName);

  const organization = await tx.organization.create({
    data: {
      name: organizationName,
      slug: organizationSlug,
    },
  });

  const workspace = await tx.workspace.create({
    data: {
      name: defaultWorkspaceName,
      slug: defaultWorkspaceSlug,
      organizationId: organization.id,
    },
  });

  const membership = await tx.membership.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      workspaceId: workspace.id,
      role: "ORG_ADMIN",
      isDefault: true,
    },
  });

  return {
    organization,
    workspace,
    membership,
  };
}
