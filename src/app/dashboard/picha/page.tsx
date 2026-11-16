import { ImageIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canPostPicha, fetchPichaPhotos } from "@/lib/picha";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PichaGallery } from "@/components/picha/PichaGallery";
import { PichaUploader } from "@/components/picha/PichaUploader";

export default async function PichaPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const photos = await fetchPichaPhotos(supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ImageIcon className="text-primary" size={28} />}
        title="Picha"
        description="Photos from our creators"
        actions={canPostPicha(user.role) ? <PichaUploader userId={user.id} /> : undefined}
      />
      {/* Remounts with fresh photos after an upload refreshes the page. */}
      <PichaGallery
        key={photos[0]?.id ?? "empty"}
        initialPhotos={photos}
        viewerId={user.id}
        viewerIsAdmin={user.role === "admin"}
      />
    </div>
  );
}
