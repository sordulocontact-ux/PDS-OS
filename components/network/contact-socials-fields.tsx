import { Field } from "@/components/auth/field";
import { FormSection } from "@/components/ui/form-section";
import { network } from "@/lib/i18n/fr/network";
import {
  deezerUrl,
  spotifyUrl,
  type ContactSocials,
} from "@/lib/network/socials";

const fr = { network };

type SocialField = "tiktok" | "instagram" | "spotify" | "deezer";

/**
 * The « Réseaux » block of the contact form: TikTok, Instagram, Spotify and
 * Deezer, each typed as a handle or pasted as a profile link (read by the
 * server, lib/network/socials.ts). Filled from the Labo for a spotted artist.
 */
export function ContactSocialsFields({
  values,
  error,
}: {
  values: Partial<ContactSocials> | undefined;
  error: { field?: string; error: string } | null;
}) {
  const t = fr.network.form;
  const fields: { name: SocialField; value: string; inputMode?: "url" }[] = [
    { name: "tiktok", value: values?.tiktok ? `@${values.tiktok}` : "" },
    {
      name: "instagram",
      value: values?.instagram ? `@${values.instagram}` : "",
    },
    {
      name: "spotify",
      value: values?.spotifyId ? spotifyUrl(values.spotifyId) : "",
      inputMode: "url",
    },
    {
      name: "deezer",
      value: values?.deezerId ? deezerUrl(values.deezerId) : "",
      inputMode: "url",
    },
  ];

  return (
    <FormSection title={t.accounts} plain>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.name}
            name={field.name}
            label={t[field.name]}
            placeholder={t[`${field.name}Placeholder`]}
            inputMode={field.inputMode}
            autoComplete="off"
            spellCheck={false}
            maxLength={500}
            defaultValue={field.value}
            error={error?.field === field.name ? error.error : undefined}
          />
        ))}
      </div>
    </FormSection>
  );
}
