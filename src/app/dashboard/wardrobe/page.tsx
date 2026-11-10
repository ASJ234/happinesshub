import Link from "next/link";
import { Shirt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BuyButton } from "@/components/listings/BuyButton";
import { ItemCard } from "@/components/listings/ItemCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth";
import { fetchWardrobeProducts, publicPhotoUrl } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export default async function WardrobePage() {
  await requireUser();
  const supabase = await createClient();
  const products = await fetchWardrobeProducts(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Shirt className="text-primary" size={28} />}
        title="Wardrobe"
        description="Sex toys from our vendors. Tap Buy to get the seller's number."
      />

      {products.length === 0 ? (
        <EmptyState>No products yet. Check back soon.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ItemCard
              key={product.id}
              photoUrl={publicPhotoUrl(supabase, product.photo_path)}
              title={product.title}
              priceUgx={product.price_ugx}
              byline={
                <Link
                  href={`/dashboard/profiles/${product.listing.id}`}
                  className="text-[11px] text-muted hover:text-foreground truncate"
                >
                  by {product.listing.display_name}
                </Link>
              }
              footer={
                <BuyButton
                  productName={product.title ?? "this product"}
                  sellerName={product.listing.display_name}
                  phoneNumber={product.listing.contact?.phone_number ?? null}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
