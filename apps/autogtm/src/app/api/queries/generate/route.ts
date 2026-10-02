import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateFocusedQuery, generateExplorationQuery } from '@autogtm/core/ai/generateDailyQuery';

export async function POST(request: NextRequest) {
  try {
    const { companyId, instructionId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, website, description, target_audience, agent_notes')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (instructionId) {
      const { data: instruction } = await supabase
        .from('company_updates')
        .select('id, content')
        .eq('id', instructionId)
        .eq('company_id', companyId)
        .single();

      if (!instruction) {
        return NextResponse.json({ error: 'Instruction not found' }, { status: 404 });
      }

      const generated = await generateFocusedQuery({
        company: {
          name: company.name,
          website: company.website,
          description: company.description,
          targetAudience: company.target_audience,
        },
        instruction: instruction.content,
      });

      const { data: inserted, error } = await supabase
        .from('exa_queries')
        .insert({
          company_id: companyId,
          query: generated.query,
          criteria: generated.criteria,
          is_active: true,
          status: 'pending',
          source_instruction_id: instructionId,
          generation_rationale: generated.rationale,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('company_updates')
        .update({ query_generated: true })
        .eq('id', instructionId);

      return NextResponse.json({ success: true, query: inserted });
    }

    const { data: pastQueries } = await supabase
      .from('exa_queries')
      .select('query, criteria')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    const generated = await generateExplorationQuery({
      company: {
        name: company.name,
        website: company.website,
        description: company.description,
        targetAudience: company.target_audience,
        agentNotes: company.agent_notes,
      },
      pastQueries: (pastQueries || []).map((q: any) => ({ ...q, leads_found: 0 })),
    });

    const { data: inserted, error } = await supabase
      .from('exa_queries')
      .insert({
        company_id: companyId,
        query: generated.query,
        criteria: generated.criteria,
        is_active: true,
        status: 'pending',
        generation_rationale: generated.rationale,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, query: inserted });
  } catch (error) {
    console.error('Error generating query:', error);
    return NextResponse.json({ error: 'Failed to generate query' }, { status: 500 });
  }
}
