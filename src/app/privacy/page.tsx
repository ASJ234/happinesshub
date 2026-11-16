import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — HAPPYPORNUG.COM" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="16 November 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your username and password (stored securely, never in plain text).</li>
          <li>The phone number you pay from and your payment references.</li>
          <li>Content you upload, listings you create, comments and chat messages.</li>
          <li>What you watch, so we can count views and pay creators.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          To run your account, unlock content you paid for, pay creators, review
          uploads and keep the site safe. We do not sell your data.
        </p>
      </section>
      <section>
        <h2>Who we share it with</h2>
        <p>
          Only the services that run the site: our database and hosting
          providers, our video hosts, and our mobile money provider for
          payments. We disclose data to the authorities when the law requires it.
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          We use cookies to keep you signed in and to remember that you
          confirmed you are 18 or older.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can ask us to delete your account and data through the support
          contact on the site.
        </p>
      </section>
    </LegalPage>
  );
}
