import Link from "next/link";
import { listCategories } from "@/server/services/admin-catalog";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/products" className="text-xs font-semibold text-brand-700">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Add a product</h1>
        <p className="mt-1 text-sm text-muted">
          Only publish listings whose price, description, photography and stock you can verify.
        </p>
      </div>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
