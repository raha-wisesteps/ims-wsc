import { SupabaseClient } from "@supabase/supabase-js";

/**
 * CRM Integration Helper
 * Syncs bisdev data (prospects, proposals, leads, sales) to CRM client database
 */

export type CRMCategory =
    | "government"
    | "ngo"
    | "media"
    | "accommodation"
    | "tour_operator"
    | "bumn"
    | "transportation"
    | "fnb"
    | "attraction"
    | "tourism_village"
    | "hospitality_suppliers"
    | "supporting_organizations"
    | "others";

export type CRMStage =
    | "prospect"
    | "proposal"
    | "lead"
    | "sales"
    | "closed_won"
    | "closed_lost";

export interface SyncToCRMParams {
    supabase: SupabaseClient;
    userId: string;
    companyName: string;
    category?: CRMCategory;
    picName?: string | null;
    picPosition?: string | null;
    picEmail?: string | null;
    picPhone?: string | null;
    stage: CRMStage;
    sourceTable: "bisdev_prospects" | "bisdev_proposals" | "bisdev_leads" | "bisdev_sales";
    sourceId: string;
    source?: string | null;
    notes?: string | null;
}

export interface SyncResult {
    success: boolean;
    clientId?: string;
    error?: string;
    isNew?: boolean;
}

/**
 * Sync a bisdev record to CRM
 * - If company already exists in CRM, update stage and log journey
 * - If company is new, create CRM entry and log journey
 */
export async function syncToCRM(params: SyncToCRMParams): Promise<SyncResult> {
    const { supabase, userId, companyName, stage, sourceTable, sourceId } = params;

    try {
        // Check if company already exists in CRM
        const { data: existing, error: findError } = await supabase
            .from("crm_clients")
            .select("id, current_stage")
            .ilike("company_name", companyName)
            .single();

        if (findError && findError.code !== "PGRST116") {
            // PGRST116 = no rows found
            throw findError;
        }

        let clientId: string;
        let isNew = false;
        let previousStage: string | null = null;

        if (existing) {
            // Update existing client
            clientId = existing.id;
            previousStage = existing.current_stage;

            // Only update if stage is progressing forward or different
            if (previousStage !== stage) {
                const { error: updateError } = await supabase
                    .from("crm_clients")
                    .update({
                        current_stage: stage,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", clientId);

                if (updateError) throw updateError;
            }
        } else {
            // Create new CRM entry
            isNew = true;
            const { data: newClient, error: insertError } = await supabase
                .from("crm_clients")
                .insert({
                    company_name: companyName,
                    category: params.category || "others",
                    current_stage: stage,
                    source: params.source || sourceTable.replace("bisdev_", ""),
                    notes: params.notes,
                    created_by: userId,
                })
                .select("id")
                .single();

            if (insertError) throw insertError;
            clientId = newClient.id;

            // Create primary contact if PIC info provided
            if (params.picName) {
                const { error: contactError } = await supabase
                    .from("crm_client_contacts")
                    .insert({
                        client_id: clientId,
                        name: params.picName,
                        position: params.picPosition || null,
                        email: params.picEmail || null,
                        phone: params.picPhone || null,
                        is_primary: true,
                        created_by: userId,
                    });

                if (contactError) {
                    console.warn("Contact creation failed:", contactError);
                }
            }
        }

        // Log journey entry
        const { error: journeyError } = await supabase.from("crm_journey").insert({
            client_id: clientId,
            from_stage: previousStage,
            to_stage: stage,
            source_table: sourceTable,
            source_id: sourceId,
            notes: isNew
                ? `Synced from ${sourceTable.replace("bisdev_", "")}`
                : `Stage updated from ${sourceTable.replace("bisdev_", "")}`,
            created_by: userId,
        });

        if (journeyError) {
            console.warn("Journey log failed:", journeyError);
        }

        return { success: true, clientId, isNew };
    } catch (error) {
        console.error("CRM sync error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Map industry to CRM category
 */
export function mapIndustryToCategory(industry: string | null): CRMCategory {
    if (!industry) return "others";

    const lowerIndustry = industry.toLowerCase();

    if (lowerIndustry.includes("government") || lowerIndustry.includes("pemerintah")) return "government";
    if (lowerIndustry.includes("ngo") || lowerIndustry.includes("nonprofit")) return "ngo";
    if (lowerIndustry.includes("media")) return "media";
    if (lowerIndustry.includes("hotel") || lowerIndustry.includes("resort") || lowerIndustry.includes("accommodation")) return "accommodation";
    if (lowerIndustry.includes("tour") || lowerIndustry.includes("travel")) return "tour_operator";
    if (lowerIndustry.includes("bumn")) return "bumn";
    if (lowerIndustry.includes("transport") || lowerIndustry.includes("airlines")) return "transportation";
    if (lowerIndustry.includes("restaurant") || lowerIndustry.includes("food") || lowerIndustry.includes("f&b")) return "fnb";
    if (lowerIndustry.includes("attraction") || lowerIndustry.includes("theme park")) return "attraction";
    if (lowerIndustry.includes("village") || lowerIndustry.includes("desa wisata")) return "tourism_village";
    if (lowerIndustry.includes("supplier") || lowerIndustry.includes("vendor")) return "hospitality_suppliers";

    return "others";
}
