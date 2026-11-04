import { zipSync, strToU8 } from 'fflate'

// Estilos de celda: 0 normal, 1 encabezado, 2 fecha, 3 fecha y hora, 4 dinero
const ESTILO = { normal: 0, encabezado: 1, fecha: 2, fechaHora: 3, dinero: 4 }

const esc = (s) =>
  String(s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

// 0 -> A, 25 -> Z, 26 -> AA
function letra(n) {
  let s = ''
  let k = n + 1
  while (k > 0) {
    const r = (k - 1) % 26
    s = String.fromCharCode(65 + r) + s
    k = Math.floor((k - 1) / 26)
  }
  return s
}

// Fechas como número de Excel (días desde 1899-12-30)
const DIA = 86400000
const BASE = Date.UTC(1899, 11, 30)

export function fechaSerial(texto) {
  if (!texto) return null
  const [a, m, d] = String(texto).slice(0, 10).split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - BASE) / DIA
}

export function fechaHoraSerial(iso) {
  if (!iso) return null
  const f = new Date(iso) // se muestra en la hora local de quien descarga
  return (Date.UTC(f.getFullYear(), f.getMonth(), f.getDate(), f.getHours(), f.getMinutes(), f.getSeconds()) - BASE) / DIA
}

function celda(v, ref) {
  let valor = v
  let estilo = 0
  if (v !== null && typeof v === 'object') {
    valor = v.v
    estilo = ESTILO[v.tipo] ?? 0
  }
  if (valor === null || valor === undefined || valor === '') return ''
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>` : ''
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`
}

function hojaXml(h) {
  const n = h.columnas.length
  const columnas = h.columnas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho ?? 16}" customWidth="1"/>`)
    .join('')
  const encabezado =
    '<row r="1">' +
    h.columnas
      .map((c, i) => `<c r="${letra(i)}1" s="1" t="inlineStr"><is><t>${esc(c.titulo)}</t></is></c>`)
      .join('') +
    '</row>'
  const filas = h.filas
    .map((fila, r) => `<row r="${r + 2}">${fila.map((v, i) => celda(v, `${letra(i)}${r + 2}`)).join('')}</row>`)
    .join('')
  const ultima = h.filas.length + 1
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${columnas}</cols><sheetData>${encabezado}${filas}</sheetData>` +
    `<autoFilter ref="A1:${letra(n - 1)}${ultima}"/></worksheet>`
  )
}

const ESTILOS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFDC405"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="5">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

// hojas: [{ nombre, columnas: [{ titulo, ancho }], filas: [[celda, celda...]] }]
// Cada celda es un texto, un número, o { v, tipo } con tipo: fecha | fechaHora | dinero
export function crearXlsx(hojas) {
  const nombres = hojas.map((h) => h.nombre.replace(/[\[\]:*?/\\]/g, '').slice(0, 31))
  const archivos = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join('') +
        '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        nombres.map((nom, i) => `<sheet name="${esc(nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hojas
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join('') +
        `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>'
    ),
    'xl/styles.xml': strToU8(ESTILOS),
  }
  hojas.forEach((h, i) => {
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(hojaXml(h))
  })
  return zipSync(archivos)
}