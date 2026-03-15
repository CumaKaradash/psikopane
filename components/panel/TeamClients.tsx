'use client'
// components/panel/TeamClients.tsx

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Users, Plus, Search, Filter, UserPlus, Eye, Phone, Mail } from 'lucide-react'

interface Client {
  id: string
  psychologist_id: string
  full_name: string
  phone?: string | null
  email?: string | null
  session_type?: string | null
  status: 'active' | 'passive' | 'new'
  created_at: string
  psychologist?: {
    id: string
    full_name: string
    title: string
    slug: string
  }
}

interface Props {
  teamId: string
}

export default function TeamClients({ teamId }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchTeamClients()
  }, [teamId])

  async function fetchTeamClients() {
    try {
      setLoading(true)
      const res = await fetch(`/api/clients?team_id=${teamId}`)
      const data = await res.json()
      
      if (res.ok) {
        setClients(data || [])
      } else {
        toast.error(data.error || 'Danışanlar yüklenemedi')
      }
    } catch (err) {
      toast.error('Danışanlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'passive': return 'text-gray-600 bg-gray-50'
      case 'new': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif'
      case 'passive': return 'Pasif'
      case 'new': return 'Yeni'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted">Toplam Danışan</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
              <p className="text-xs text-muted">Aktif Danışan</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'new').length}</p>
              <p className="text-xs text-muted">Yeni Danışan</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter(c => c.phone).length}</p>
              <p className="text-xs text-muted">Telefonlu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Danışan Havuzu
          </h3>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Danışan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
              <option value="new">Yeni</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danışan Listesi */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Danışanlar ({filteredClients.length})
          </h3>
        </div>
        
        {filteredClients.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">
              {searchTerm ? 'Arama kriterlerinize uygun danışan bulunamadı.' : 'Henüz danışan eklenmemiş.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredClients.map(client => (
              <div key={client.id} className="px-5 py-4 hover:bg-cream/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center text-white font-bold">
                      {client.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{client.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                        {client.session_type && (
                          <span>{client.session_type}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(client.status)}`}>
                      {getStatusText(client.status)}
                    </span>
                    {client.psychologist && (
                      <span className="text-xs text-muted">
                        {client.psychologist.full_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
