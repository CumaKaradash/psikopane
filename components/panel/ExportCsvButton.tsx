'use client'
// components/panel/ExportCsvButton.tsx — Yanıt verilerini CSV olarak indir

interface Column { header: string; value: (row: any) => string }

interface Props {
  data: any[]
  columns: Column[]
  filename: string
  label?: string
}

export default function ExportCsvButton({ data, columns, filename, label = 'CSV İndir' }: Props) {
  function download() {
    const bom = '\uFEFF'
    const header = columns.map(c => `"${c.header}"`).join(',')
    const rows = data.map(row =>
      columns.map(c => {
        const v = c.value(row) ?? ''
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = bom + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors"
    >
      ⬇ {label}
    </button>
  )
}
