// Hand-written to match supabase/migrations/0001 through 0011 exactly.
// This is NOT a substitute for the real source of truth — once you have
// a live Supabase project with these migrations applied, regenerate
// with:
//
//   npx supabase gen types typescript --project-id <your-ref> > src/lib/supabase/types.ts
//
// The shape here matches what that command produces, so swapping the
// generated file in later is a drop-in replacement — no application
// code changes needed.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "admin"
  | "editor_in_chief"
  | "section_editor"
  | "reviewer"
  | "author";

export type ArticleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revisions_requested"
  | "accepted"
  | "awaiting_payment"
  | "in_production"
  | "published"
  | "rejected"
  | "withdrawn";

export type SubmissionSource = "self" | "admin_proxy";
export type DoiStatus = "none" | "pending" | "registered";
export type ManuscriptFileType =
  | "original_submission"
  | "revision"
  | "cover_letter"
  | "supplementary"
  | "response_to_reviewers"
  | "final_pdf";
export type ReviewRecommendation =
  | "accept"
  | "minor_revisions"
  | "major_revisions"
  | "reject";
export type InvitationStatus = "invited" | "accepted" | "declined" | "expired";
export type EditorialDecisionType =
  | "accept"
  | "minor_revisions"
  | "major_revisions"
  | "reject";
export type PaymentStatus = "pending" | "paid" | "failed" | "waived";
export type PaymentMethod = "paystack" | "manual_offline" | "waived";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          affiliation: string | null;
          orcid: string | null;
          bio: string | null;
          avatar_path: string | null;
          is_active: boolean;
          welcome_email_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          affiliation?: string | null;
          orcid?: string | null;
          bio?: string | null;
          avatar_path?: string | null;
          is_active?: boolean;
          welcome_email_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          section_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          section_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>;
        Relationships: [];
      };
      volumes: {
        Row: {
          id: string;
          number: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          year: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["volumes"]["Insert"]>;
        Relationships: [];
      };
      issues: {
        Row: {
          id: string;
          volume_id: string;
          number: number;
          title: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          volume_id: string;
          number: number;
          title?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["issues"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          abstract: string;
          keywords: string[];
          section_id: string;
          issue_id: string | null;
          status: ArticleStatus;
          submitted_via: SubmissionSource;
          created_by: string | null;
          doi: string | null;
          doi_status: DoiStatus;
          license: string;
          language: string;
          publication_date: string | null;
          pdf_path: string | null;
          page_start: number | null;
          page_end: number | null;
          article_order: number | null;
          submitted_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          abstract: string;
          keywords?: string[];
          section_id: string;
          issue_id?: string | null;
          status?: ArticleStatus;
          submitted_via?: SubmissionSource;
          created_by?: string | null;
          doi?: string | null;
          doi_status?: DoiStatus;
          license?: string;
          language?: string;
          publication_date?: string | null;
          pdf_path?: string | null;
          page_start?: number | null;
          page_end?: number | null;
          article_order?: number | null;
          submitted_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [];
      };
      article_authors: {
        Row: {
          id: string;
          article_id: string;
          user_id: string | null;
          display_name: string;
          email: string | null;
          affiliation: string | null;
          orcid: string | null;
          author_order: number;
          is_corresponding: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id?: string | null;
          display_name: string;
          email?: string | null;
          affiliation?: string | null;
          orcid?: string | null;
          author_order?: number;
          is_corresponding?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["article_authors"]["Insert"]
        >;
        Relationships: [];
      };
      manuscript_files: {
        Row: {
          id: string;
          article_id: string;
          file_type: ManuscriptFileType;
          file_path: string;
          version: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          file_type: ManuscriptFileType;
          file_path: string;
          version?: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["manuscript_files"]["Insert"]
        >;
        Relationships: [];
      };
      review_invitations: {
        Row: {
          id: string;
          article_id: string;
          reviewer_id: string;
          status: InvitationStatus;
          invited_by: string | null;
          invited_at: string;
          responded_at: string | null;
          deadline: string | null;
        };
        Insert: {
          id?: string;
          article_id: string;
          reviewer_id: string;
          status?: InvitationStatus;
          invited_by?: string | null;
          invited_at?: string;
          responded_at?: string | null;
          deadline?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["review_invitations"]["Insert"]
        >;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          article_id: string;
          reviewer_id: string;
          round: number;
          recommendation: ReviewRecommendation | null;
          comments_to_author: string | null;
          comments_to_editor: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          reviewer_id: string;
          round?: number;
          recommendation?: ReviewRecommendation | null;
          comments_to_author?: string | null;
          comments_to_editor?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      editorial_decisions: {
        Row: {
          id: string;
          article_id: string;
          decided_by: string;
          decision: EditorialDecisionType;
          round: number;
          decision_letter: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          decided_by: string;
          decision: EditorialDecisionType;
          round?: number;
          decision_letter?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["editorial_decisions"]["Insert"]
        >;
        Relationships: [];
      };
      apc_rates: {
        Row: {
          id: string;
          amount: number;
          currency: string;
          section_id: string | null;
          is_active: boolean;
          effective_from: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          currency?: string;
          section_id?: string | null;
          is_active?: boolean;
          effective_from?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["apc_rates"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          article_id: string;
          amount_charged: number;
          currency: string;
          status: PaymentStatus;
          payment_method: PaymentMethod;
          paystack_reference: string | null;
          waived_by: string | null;
          waived_reason: string | null;
          recorded_by: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          amount_charged: number;
          currency?: string;
          status?: PaymentStatus;
          payment_method?: PaymentMethod;
          paystack_reference?: string | null;
          waived_by?: string | null;
          waived_reason?: string | null;
          recorded_by?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["announcements"]["Insert"]
        >;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      article_status: ArticleStatus;
      submission_source: SubmissionSource;
      doi_status: DoiStatus;
      manuscript_file_type: ManuscriptFileType;
      review_recommendation: ReviewRecommendation;
      invitation_status: InvitationStatus;
      editorial_decision_type: EditorialDecisionType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
  };
};
