import { useState, useEffect } from 'react'
import { 
  X, 
  File, 
  Image, 
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Copy,
  Check
} from 'lucide-react'

interface FilePreviewProps {
  filePath: string
  fileName: string
  onClose: () => void
}

type FileType = 'text' | 'image' | 'unknown'

export default function FilePreview({ filePath, fileName, onClose }: FilePreviewProps) {
  const [fileType, setFileType] = useState<FileType>('unknown')
  const [content, setContent] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPreview()
  }, [filePath])

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isTextFile = (ext: string) => {
    const textExtensions = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'xml', 'yaml', 'yml', 'log', 'csv', 'ini', 'conf', 'sh', 'bat', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'vue', 'scss', 'less']
    return textExtensions.includes(ext)
  }

  const isImageFile = (ext: string) => {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']
    return imageExtensions.includes(ext)
  }

  const loadPreview = async () => {
    if (!window.electronAPI) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const ext = getFileExtension(fileName)
      
      if (isImageFile(ext)) {
        setFileType('image')
        // 使用file://协议加载本地图片
        setImageUrl(`file://${filePath}`)
      } else if (isTextFile(ext)) {
        setFileType('text')
        const result = await window.electronAPI.fs.readFile(filePath)
        if (result.content) {
          setContent(result.content)
        } else {
          setError('无法读取文件内容')
        }
      } else {
        setFileType('unknown')
      }
    } catch (err) {
      setError('加载预览失败')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenExternal = () => {
    window.electronAPI?.shell.openExternal(`file://${filePath}`)
  }

  const getFileIcon = () => {
    const ext = getFileExtension(fileName)
    if (isImageFile(ext)) return <Image size={48} className="text-purple-500" />
    if (isTextFile(ext)) return <FileText size={48} className="text-blue-500" />
    return <File size={48} className="text-studio-400" />
  }

  return (
    <div className="fixed inset-0 bg-ink-400/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-elevated animate-slideIn">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-studio-100 flex items-center justify-center">
              {getFileIcon()}
            </div>
            <div>
              <h3 className="font-medium text-ink-100">{fileName}</h3>
              <p className="text-xs text-studio-500">{filePath}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-studio-100 text-studio-500"
              title="复制内容"
              disabled={fileType !== 'text'}
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
            <button
              onClick={handleOpenExternal}
              className="p-2 rounded-lg hover:bg-studio-100 text-studio-500"
              title="用系统默认程序打开"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-studio-100 text-studio-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-studio-400">加载中...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-studio-400">
              <File size={48} className="mb-3 opacity-50" />
              <p>{error}</p>
              <p className="text-sm mt-2">不支持预览此文件类型</p>
              <button
                onClick={handleOpenExternal}
                className="mt-4 btn btn-primary"
              >
                用系统程序打开
              </button>
            </div>
          ) : fileType === 'image' && imageUrl ? (
            <div className="flex items-center justify-center h-full">
              <img 
                src={imageUrl} 
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : fileType === 'text' && content ? (
            <pre className="text-sm text-ink-100 whitespace-pre-wrap font-mono bg-studio-50 p-4 rounded-xl overflow-auto h-full">
              {content}
            </pre>
          ) : null}
        </div>

        {/* 底部 */}
        <div className="px-4 py-2 border-t border-studio-200 flex items-center justify-between text-xs text-studio-500">
          <span>{fileType === 'text' ? `${content?.length || 0} 字符` : fileType === 'image' ? '图片文件' : '不支持预览'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-1 hover:text-ink-100"
            >
              <Download size={14} />
              下载
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
