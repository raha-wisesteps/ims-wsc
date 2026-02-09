
import { createClient } from "@/lib/supabase/client";

export type OpportunityStage = 'prospect' | 'proposal' | 'leads' | 'sales';

export interface Opportunity {
    id: string;
    client_id: string;
    title: string;
    stage: OpportunityStage;
    status: string;
    value: number;
    priority: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    expected_close_date?: string;
    opportunity_type?: 'customer_based' | 'product_based';
    cash_in?: number;
    client?: {
        company_name: string;
        contact_person?: string;
        contacts?: {
            name: string;
            email: string;
            phone: string;
            position: string;
        }[];
    };
    jira_link?: string;
    drive_link?: string;
}

export const opportunityService = {
    // Fetch opportunities
    getOpportunities: async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('crm_opportunities')
            .select(`
                *,
                client:crm_clients(
                    id, 
                    company_name,
                    contacts:crm_client_contacts(name, email, phone, position)
                )
            `)
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        return data as Opportunity[];
    },

    // Create new opportunity
    createOpportunity: async (opportunity: Partial<Opportunity>) => {
        const supabase = createClient();
        
        // 1. Create Opportunity
        const { data, error } = await supabase
            .from('crm_opportunities')
            .insert(opportunity)
            .select()
            .single();
            
        if (error) throw error;

        // 2. Log Journey (Initial)
        await supabase.from('crm_journey').insert({
            client_id: opportunity.client_id,
            opportunity_id: data.id,
            from_stage: null,
            to_stage: opportunity.stage,
            status: opportunity.status,
            notes: `Created new opportunity: ${opportunity.title}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
        });

        return data;
    },

    // Update Stage/Status (Move)
    updateStage: async (id: string, newStage: string, newStatus: string, oldStage?: string) => {
        const supabase = createClient();
        
        // 1. Get current opportunity to get client_id and current status
        const { data: currentOpp, error: fetchError } = await supabase
            .from('crm_opportunities')
            .select('client_id, title, stage, status')
            .eq('id', id)
            .single();

        if (fetchError || !currentOpp) throw fetchError || new Error("Opportunity not found");

        // 2. Update Opportunity
        const { data, error } = await supabase
            .from('crm_opportunities')
            .update({ 
                stage: newStage, 
                status: newStatus,
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 3. Log Journey
        if (oldStage !== newStage || currentOpp.status !== newStatus) {
            await supabase.from('crm_journey').insert({
                client_id: currentOpp.client_id,
                opportunity_id: id,
                from_stage: oldStage || currentOpp.stage,
                to_stage: newStage,
                status: newStatus,
                notes: `Moved from ${oldStage || currentOpp.stage} (${currentOpp.status}) to ${newStage} (${newStatus})`,
                created_by: (await supabase.auth.getUser()).data.user?.id
            });
        }

        return data;
    },
    
    // Update Details (Value, Notes, etc.)
    updateOpportunity: async (id: string, updates: Partial<Opportunity>) => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('crm_opportunities')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // Delete (Archive)
    deleteOpportunity: async (id: string) => {
        const supabase = createClient();
        const { error } = await supabase
            .from('crm_opportunities')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }
};
