import { useEffect, useState } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import { enhanceContentWithAI, formatArticle } from './lib/formatter'

function App() {
  const [content, setContent] = useState('')
  const [previewContent, setPreviewContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('mint')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (!content.trim()) {
      setPreviewContent('')
      return
    }

    setPreviewContent(formatArticle(content, selectedTemplate))
  }, [content, selectedTemplate])

  const handleSmartFormat = () => {
    if (!content.trim()) {
      return
    }
    setContent(enhanceContentWithAI(content))
  }

  return (
    <div className="app-shell min-h-screen">
      <TopBar
        content={previewContent}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
      />

      <div className="mx-auto flex w-full max-w-[1600px] gap-3 px-3 pb-3">
        {sidebarOpen && (
          <Sidebar
            content={content}
            selectedTemplate={selectedTemplate}
            onContentChange={setContent}
            onTemplateChange={setSelectedTemplate}
            onSmartFormat={handleSmartFormat}
          />
        )}

        <main className="flex min-h-[calc(100vh-84px)] flex-1 gap-3">
          <section className="panel flex min-w-0 flex-1">
            <Editor content={content} onContentChange={setContent} />
          </section>
          <section className="panel flex w-[430px] min-w-[390px]">
            <Preview content={previewContent} template={selectedTemplate} />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
