export type TextType = "plain" | "rich" | "url";

export type TextEntry = {
  key: string;
  text: string;
  text_type: TextType;
};

export type AdminTextEntry = TextEntry & {
  updated_by_user_id: number | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};
