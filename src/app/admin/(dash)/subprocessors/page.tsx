import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveSubprocessor, deleteSubprocessor } from "../content-actions";
import { reorderSubprocessors } from "../reorder-actions";
import { SubprocessorImport } from "./SubprocessorImport";

export const dynamic = "force-dynamic";

export default async function SubprocessorsPage() {
  await requireModuleView("subprocessors");
  const items = await prisma.subprocessor.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader
        title="Subprocessors"
        description="Third-party providers listed on the public trust center. Add one at a time, or import many from a spreadsheet or document."
        action={<SubprocessorImport />}
      />
      <ContentManager
        newLabel="New subprocessor"
        items={items.map((s) => ({
          id: s.id,
          name: s.name,
          purpose: s.purpose,
          location: s.location,
          website: s.website ?? "",
          sortOrder: s.sortOrder,
          isActive: s.isActive,
        }))}
        columns={[
          { key: "name", label: "Name" },
          { key: "purpose", label: "Purpose" },
          { key: "location", label: "Location" },
          { key: "website", label: "Website", type: "link" },
          { key: "isActive", label: "Active", type: "bool" },
        ]}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "location", label: "Location", type: "text", required: true },
          { name: "purpose", label: "Purpose", type: "text", required: true, full: true },
          { name: "website", label: "Trust / security page URL", type: "text", placeholder: "https://trust.provider.com", hint: "Links out from the public subprocessor list." },
          { name: "isActive", label: "Active (shown publicly)", type: "checkbox" },
        ]}
        saveAction={saveSubprocessor}
        deleteAction={deleteSubprocessor}
        reorderAction={reorderSubprocessors}
      />
    </div>
  );
}
