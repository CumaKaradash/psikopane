import type { SupabaseClient } from '@supabase/supabase-js'
// app/api/network/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type TeamMemberStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'

// ── Slug yardımcısı ───────────────────────────────────────────────────────────
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || 'klinik'
}

// Benzersiz takım slug'ı (teams tablosunda unique)
async function uniqueTeamSlug(
  supabase: SupabaseClient,
  base: string,
  maxTries = 5
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`
    const { count } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate)
    if ((count ?? 0) === 0) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: sent }, { data: received }, { data: teams }, { data: teamInvitations }] = await Promise.all([
    supabase
      .from('connections')
      .select('*, addressee:profiles!addressee_id(id, full_name, title, slug)')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('connections')
      .select('*, requester:profiles!requester_id(id, full_name, title, slug)')
      .eq('addressee_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('teams')
      .select(`
        *, members:team_members(
          id, psychologist_id, role, status, joined_at,
          profile:profiles!psychologist_id(id, full_name, title, slug)
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('team_members')
      .select(`
        *, team:teams(id, name, slug, description),
        profile:profiles!psychologist_id(id, full_name, title, slug)
      `)
      .eq('psychologist_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    sent:     sent     ?? [],
    received: received ?? [],
    teams:    teams    ?? [],
    teamInvitations: teamInvitations ?? [],
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // ── Bağlantı isteği gönder ────────────────────────────────────────────────
  if (body.action === 'connect') {
    const email = body.email?.toLowerCase().trim()
    if (!email)
      return NextResponse.json({ error: 'E-posta zorunlu' }, { status: 400 })

    const { data: target } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single()

    if (!target)
      return NextResponse.json(
        { error: 'Bu e-posta ile kayıtlı psikolog bulunamadı' },
        { status: 404 }
      )
    if (target.id === user.id)
      return NextResponse.json(
        { error: 'Kendinize bağlantı isteği gönderemezsiniz' },
        { status: 400 }
      )

    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: user.id, addressee_id: target.id })
      .select()
      .single()

    if (error) {
      if (error.message.includes('unique'))
        return NextResponse.json({ error: 'Bu kişiye zaten istek gönderilmiş' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ...data, addressee_name: target.full_name }, { status: 201 })
  }

  // ── E-posta ile psikolog ara ──────────────────────────────────────────────
  if (body.action === 'find_by_email') {
    const email = body.email?.toLowerCase().trim()
    if (!email)
      return NextResponse.json({ error: 'E-posta zorunlu' }, { status: 400 })

    const { data: target } = await supabase
      .from('profiles')
      .select('id, full_name, title, slug')
      .eq('email', email)
      .single()

    if (!target)
      return NextResponse.json(
        { error: 'Bu e-posta ile kayıtlı psikolog bulunamadı' },
        { status: 404 }
      )
    if (target.id === user.id)
      return NextResponse.json({ error: 'Kendinizi ekleyemezsiniz' }, { status: 400 })

    return NextResponse.json(target)
  }

  // ── Takım oluştur ─────────────────────────────────────────────────────────
  if (body.action === 'create_team') {
    const { name, description } = body
    if (!name?.trim())
      return NextResponse.json({ error: 'Takım adı zorunlu' }, { status: 400 })

    // Slug üret ve benzersizliğini garantile
    const baseSlug = toSlug(name.trim())
    const slug     = await uniqueTeamSlug(supabase, baseSlug)

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name:        name.trim(),
        description: description?.trim() || null,
        owner_id:    user.id,
        slug,                        // ← otomatik üretildi
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('unique'))
        return NextResponse.json(
          { error: 'Bu isimde bir takım zaten var, farklı bir ad deneyin' },
          { status: 409 }
        )
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sahibi otomatik owner olarak ekle
    await supabase
      .from('team_members')
      .insert({ team_id: team.id, psychologist_id: user.id, role: 'owner', status: 'accepted' })

    return NextResponse.json(team, { status: 201 })
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // ── Bağlantı isteğini yanıtla ─────────────────────────────────────────────
  if (body.action === 'respond') {
    const { connection_id, status } = body
    if (!connection_id || !status)
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const { data, error } = await supabase
      .from('connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', connection_id)
      .eq('addressee_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // ── Takıma üye ekle ───────────────────────────────────────────────────────
  if (body.action === 'add_member') {
    const { team_id, psychologist_id } = body
    if (!team_id || !psychologist_id)
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', team_id)
      .single()

    if (!team || team.owner_id !== user.id)
      return NextResponse.json(
        { error: 'Yalnızca takım sahibi üye ekleyebilir' },
        { status: 403 }
      )

    // Önce kişinin mevcut durumunu kontrol et
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', team_id)
      .eq('psychologist_id', psychologist_id)
      .single()

    let finalData
    let statusCode = 201

    // Eğer kişi zaten üye ve durumu 'rejected' ise, durumunu 'pending' yaparak tekrar davet et
    if (existingMember && existingMember.status === 'rejected') {
      const { data: updatedMember } = await supabase
        .from('team_members')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (updatedMember) {
        finalData = updatedMember
        statusCode = 200 // Updated existing record
      } else {
        return NextResponse.json({ error: 'Tekrar davet gönderilemedi' }, { status: 500 })
      }
    } else {
      // Yeni üye ekle
      const { data, error } = await supabase
        .from('team_members')
        .insert({ team_id, psychologist_id, role: 'member', status: 'pending' })
        .select()
        .single()

      if (error) {
        if (error.message.includes('unique'))
          return NextResponse.json({ error: 'Bu kişi zaten takım üyesi' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      finalData = data
    }

    return NextResponse.json(finalData, { status: statusCode })
  }

  // ── Takım davetini yanıtla ───────────────────────────────────────────────────
  if (body.action === 'respond_team_invite') {
    const { team_id, status } = body
    if (!['pending', 'accepted', 'rejected', 'blocked'].includes(status))
      return NextResponse.json({ error: 'Eksik veya geçersiz alan' }, { status: 400 })

    const { data, error } = await supabase
      .from('team_members')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('team_id', team_id)
      .eq('psychologist_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.message.includes('No rows matched')) {
        return NextResponse.json({ error: 'Takım daveti bulunamadı' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const connectionId = searchParams.get('connection_id')
  const memberId     = searchParams.get('member_id')

  if (connectionId) {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (memberId) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Silinecek kaynak belirtilmedi' }, { status: 400 })
}
