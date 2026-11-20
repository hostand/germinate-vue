// The icon of a file by its extension (Font Awesome file icons), with the colour of its family.
// getFileIcon('trials.xlsx') -> { icon: 'fa-file-excel', color: '#1d7a45', extension: 'xlsx' }
const FAMILIES = [
  { icon: 'fa-file-excel', color: '#1d7a45', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'ods'] },
  { icon: 'fa-file-csv', color: '#2a8c80', extensions: ['csv', 'tsv'] },
  { icon: 'fa-file-pdf', color: '#c8323f', extensions: ['pdf'] },
  { icon: 'fa-file-word', color: '#2b5797', extensions: ['doc', 'docx', 'odt', 'rtf'] },
  { icon: 'fa-file-powerpoint', color: '#d24726', extensions: ['ppt', 'pptx', 'odp'] },
  { icon: 'fa-file-zipper', color: '#b7791f', extensions: ['zip', 'gz', 'tgz', '7z', 'rar', 'tar', 'bz2', 'xz'] },
  { icon: 'fa-file-image', color: '#8e5ea2', extensions: ['png', 'jpg', 'jpeg', 'gif', 'tif', 'tiff', 'svg', 'bmp', 'webp'] },
  { icon: 'fa-file-video', color: '#d16b8e', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] },
  { icon: 'fa-file-audio', color: '#4e79a7', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a'] },
  { icon: 'fa-file-code', color: '#5b6770', extensions: ['json', 'xml', 'js', 'py', 'r', 'html', 'sql', 'yml', 'yaml', 'sh'] },
  { icon: 'fa-file-lines', color: '#6b6f6c', extensions: ['txt', 'md', 'log', 'hapmap', 'vcf', 'fasta', 'fa', 'map'] }
]
const OTHER = { icon: 'fa-file', color: '#8a8f8b' }

const getFileExtension = name => {
  const match = /\.([a-z0-9]+)$/i.exec(`${name || ''}`.trim())
  return match ? match[1].toLowerCase() : null
}

const getFileIcon = (...names) => {
  const extension = names.map(getFileExtension).find(e => e) || null
  const family = extension ? FAMILIES.find(f => f.extensions.includes(extension)) : null
  return { ...(family || OTHER), extension }
}

export {
  getFileIcon,
  getFileExtension
}
