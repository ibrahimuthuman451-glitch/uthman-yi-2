import { listCategories } from "@/server/services/admin-catalog";
import { AdminActionForm } from "@/components/admin/action-form";
import { saveCategoryAction } from "@/app/actions/admin-catalog";
import type { ActionState } from "@/lib/action-state";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Categories</h1>
        <p className="mt-1 text-sm text-muted">
          Categories organise the shop navigation. Only active categories with published products are
          shown to customers.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Products</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <p className="font-medium text-navy-900">{category.name}</p>
                    <p className="break-anywhere text-xs text-navy-400">/{category.slug}</p>
                    {category.description ? (
                      <p className="mt-1 text-xs text-navy-500">{category.description}</p>
                    ) : null}
                  </td>
                  <td className="text-sm">{category._count.products}</td>
                  <td>
                    <Badge tone={category.isActive ? "success" : "neutral"}>
                      {category.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-base font-semibold text-navy-900">Add a category</h2>
          <div className="mt-4">
            <AdminActionForm
              action={saveCategoryAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
              submitLabel="Create category"
              resetOnSuccess
            >
              <Field label="Name" htmlFor="name" required>
                <Input id="name" name="name" required maxLength={80} />
              </Field>
              <Field label="Slug (optional)" htmlFor="slug">
                <Input id="slug" name="slug" maxLength={80} />
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea id="description" name="description" rows={2} maxLength={400} />
              </Field>
              <Field label="Sort order" htmlFor="sortOrder">
                <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={10} />
              </Field>
              <Checkbox id="isActive" name="isActive" defaultChecked label="Active" />
            </AdminActionForm>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-base font-semibold text-navy-900">Edit a category</h2>
        <p className="mt-1 text-xs text-muted">Update names, ordering and visibility. Products are never deleted.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-navy-100 p-4">
              <AdminActionForm
                action={saveCategoryAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
                submitLabel="Save changes"
              >
                <input type="hidden" name="categoryId" value={category.id} />
                <Field label="Name" htmlFor={`name-${category.id}`} required>
                  <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Slug" htmlFor={`slug-${category.id}`}>
                    <Input id={`slug-${category.id}`} name="slug" defaultValue={category.slug} />
                  </Field>
                  <Field label="Sort order" htmlFor={`sort-${category.id}`}>
                    <Input id={`sort-${category.id}`} name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} />
                  </Field>
                </div>
                <Field label="Description" htmlFor={`desc-${category.id}`}>
                  <Textarea id={`desc-${category.id}`} name="description" rows={2} defaultValue={category.description ?? ""} />
                </Field>
                <Checkbox id={`active-${category.id}`} name="isActive" defaultChecked={category.isActive} label="Active" />
              </AdminActionForm>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
