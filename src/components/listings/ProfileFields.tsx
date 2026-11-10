"use client";

import { Phone } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/components/ui/styles";

export interface ProfileValues {
  display_name: string;
  phone_number: string;
  address: string;
  description: string;
}

export const EMPTY_PROFILE: ProfileValues = {
  display_name: "",
  phone_number: "",
  address: "",
  description: "",
};

interface ProfileFieldsProps {
  values: ProfileValues;
  onChange: (values: ProfileValues) => void;
  nameLabel?: string;
}

/** Name, number, location and bio: shared by the create and edit forms. */
export function ProfileFields({
  values,
  onChange,
  nameLabel = "Name",
}: ProfileFieldsProps) {
  const set =
    (key: keyof ProfileValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={nameLabel}>
        <input
          type="text"
          value={values.display_name}
          onChange={set("display_name")}
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <Field label="Phone number">
        <span className="relative block">
          <Phone
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="tel"
            value={values.phone_number}
            onChange={set("phone_number")}
            maxLength={40}
            className={`${inputClass} pl-8`}
          />
        </span>
      </Field>
      <Field label="Location" optional className="sm:col-span-2">
        <input
          type="text"
          value={values.address}
          onChange={set("address")}
          maxLength={300}
          className={inputClass}
        />
      </Field>
      <Field label="Bio" optional className="sm:col-span-2">
        <textarea
          value={values.description}
          onChange={set("description")}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </Field>
    </div>
  );
}
