
import { CSSProperties, FormEvent, MouseEvent, ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AICover,
  AuthUser,
  BillingCycle as ApiBillingCycle,
  BrandTheme,
  createDraft,
  createPaymentOrder,
  deleteDraft,
  DraftRecord,
  deleteTheme,
  generateAICovers,
  getEntitlements,
  getPaymentOrder,
  authStorage,
  createTheme,
  getCurrentUser,
  getSubscription,
  listDrafts,
  listThemes,
  login,
  logout,
  PaymentMethod as ApiPaymentMethod,
  PaymentOrder,
  register,
  simulatePayment,
  updateDraft,
  UserEntitlements,
  SubscriptionInfo,
} from './lib/api'
import { enhanceContentWithAI, formatArticle } from './lib/formatter'

type Platform = 'wechat' | 'xiaohongshu'
type TemplateTier = 'free' | 'vip'
type AuthMode = 'login' | 'register'
type PayMethod = ApiPaymentMethod
type BillingCycle = ApiBillingCycle
type ThemePanelTab = 'recommended' | 'saved'
type WorkFilter = 'all' | Platform

type Template = {
  id: string
  name: string
  formatterKey: string
  tier: TemplateTier
  tag: string
  platforms: Platform[]
  summary: string
}

type Palette = {
  id: string
  name: string
  accent: string
  soft: string
  glow: string
  scope: Platform | 'all'
  source: 'preset' | 'saved'
}

const draft = `春天的内容运营，不只是换一张封面这么简单

如果你的公众号或小红书内容还停留在“写完就发”，今年很容易被更会包装的账号拉开差距。

一套真正能提升点击和转化的内容系统，至少要同时考虑以下三个动作：

1. 标题必须先解决读者为什么点进来。
2. 首屏封面需要在两秒内建立内容气质。
3. 正文排版要让重点和情绪层次更容易被读到。

为什么越来越多团队开始重视排版？

- 平台竞争进入精细化阶段，内容视觉已经成为转化因子。
- AI 让写作速度变快，但内容同质化也更严重。
- 用户阅读时间更短，需要更清晰的结构和更强的第一眼吸引力。`

const platforms = [
  { id: 'wechat' as const, name: '微信公众号', desc: '长文排版、封面与导出 HTML' },
  { id: 'xiaohongshu' as const, name: '小红书', desc: '笔记排版、首图与发布清单' },
]

const templates: Template[] = [
  { id: 'mint', name: '留白长文', formatterKey: 'mint', tier: 'free', tag: '推荐', platforms: ['wechat', 'xiaohongshu'], summary: '清爽、留白、适合知识型内容' },
  { id: 'slate', name: '杂志简报', formatterKey: 'slate', tier: 'free', tag: '通用', platforms: ['wechat', 'xiaohongshu'], summary: '信息密度高，适合运营周报' },
  { id: 'sunrise', name: '温暖故事', formatterKey: 'sunrise', tier: 'free', tag: '免费', platforms: ['wechat', 'xiaohongshu'], summary: '柔和叙事，适合案例与品牌故事' },
  { id: 'ocean', name: '蓝调干货', formatterKey: 'ocean', tier: 'free', tag: '热门', platforms: ['wechat', 'xiaohongshu'], summary: '冷静可信，适合教程和方法论' },
  { id: 'paper', name: '纸感专栏', formatterKey: 'paper', tier: 'free', tag: '新', platforms: ['wechat', 'xiaohongshu'], summary: '纸媒质感，适合长文专栏' },
  { id: 'sprout', name: '氧气手账', formatterKey: 'sprout', tier: 'free', tag: '新', platforms: ['xiaohongshu'], summary: '更轻松的笔记语感和清单节奏' },
  { id: 'forest-pro', name: '森系品牌', formatterKey: 'forest-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat', 'xiaohongshu'], summary: '偏品牌叙事，适合生活方式内容' },
  { id: 'graphite-pro', name: '高端商务', formatterKey: 'graphite-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat'], summary: '商务提案风，适合 B 端内容' },
  { id: 'amber-note', name: '治愈笔记', formatterKey: 'amber-note', tier: 'vip', tag: 'VIP', platforms: ['xiaohongshu'], summary: '暖调种草，适合情绪价值内容' },
  { id: 'studio-pro', name: '创意提案', formatterKey: 'studio-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat', 'xiaohongshu'], summary: '更有设计感，适合创意行业' },
  { id: 'linen-pro', name: '亚麻专栏', formatterKey: 'linen-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat', 'xiaohongshu'], summary: '温润专栏感，适合品牌文章' },
  { id: 'berry-note', name: '莓果种草', formatterKey: 'berry-note', tier: 'vip', tag: 'VIP', platforms: ['xiaohongshu'], summary: '女性向种草模板，适合生活分享' },
  { id: 'editorial-pro', name: '编辑部版式', formatterKey: 'editorial-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat'], summary: '像媒体特稿，适合观点输出' },
  { id: 'jade-editor', name: '翡翠编辑室', formatterKey: 'jade-editor', tier: 'vip', tag: 'VIP', platforms: ['wechat', 'xiaohongshu'], summary: '高级青绿调，适合品牌栏目' },
  { id: 'peach-fizz', name: '蜜桃气泡', formatterKey: 'peach-fizz', tier: 'vip', tag: 'VIP', platforms: ['xiaohongshu'], summary: '轻甜封面感，适合笔记与清单' },
  { id: 'carbon-pro', name: '碳黑简报', formatterKey: 'carbon-pro', tier: 'vip', tag: 'VIP', platforms: ['wechat'], summary: '强信息秩序，适合深度干货' },
  { id: 'camellia-note', name: '山茶笔记', formatterKey: 'camellia-note', tier: 'vip', tag: 'VIP', platforms: ['xiaohongshu'], summary: '带情绪和氛围，适合种草内容' },
  { id: 'mono-brief', name: '黑白快报', formatterKey: 'mono-brief', tier: 'vip', tag: 'VIP', platforms: ['wechat', 'xiaohongshu'], summary: '极简黑白，适合专业感账号' },
]

const palettes: Palette[] = [
  { id: 'mist', name: '雾青', accent: '#6d8f7c', soft: '#eef5f1', glow: 'rgba(109,143,124,.26)', scope: 'all', source: 'preset' },
  { id: 'rose', name: '莓粉', accent: '#b66464', soft: '#faefef', glow: 'rgba(182,100,100,.25)', scope: 'all', source: 'preset' },
  { id: 'navy', name: '海军蓝', accent: '#4c5fb0', soft: '#eef1ff', glow: 'rgba(76,95,176,.25)', scope: 'all', source: 'preset' },
  { id: 'gold', name: '暖金', accent: '#ae7c3e', soft: '#fbf2e6', glow: 'rgba(174,124,62,.25)', scope: 'all', source: 'preset' },
  { id: 'jade', name: '松石绿', accent: '#2d9b8f', soft: '#e6f7f4', glow: 'rgba(45,155,143,.24)', scope: 'all', source: 'preset' },
  { id: 'peach', name: '蜜桃杏', accent: '#e98b63', soft: '#fff0e8', glow: 'rgba(233,139,99,.24)', scope: 'xiaohongshu', source: 'preset' },
  { id: 'ink', name: '墨灰', accent: '#404b5a', soft: '#eef1f4', glow: 'rgba(64,75,90,.22)', scope: 'wechat', source: 'preset' },
  { id: 'camellia', name: '山茶粉', accent: '#d45a87', soft: '#ffeaf2', glow: 'rgba(212,90,135,.22)', scope: 'xiaohongshu', source: 'preset' },
]

const plans = [
  {
    id: 'yearly' as const,
    name: '年度会员',
    price: '¥179',
    originalPrice: '¥269',
    duration: '13个月',
    badge: '限时特惠',
    note: '额外赠送1个月，共13个月',
    desc: '适合长期运营，包含赠送时长',
    perks: ['全部模板', '自定义主题', 'AI 封面每天 3 次'],
  },
  {
    id: 'quarterly' as const,
    name: '季度会员',
    price: '¥59',
    originalPrice: '¥79',
    duration: '90天',
    badge: '稳定方案',
    note: '适合季度运营和短期栏目项目',
    desc: '适合阶段性高频排版',
    perks: ['全部模板', '自定义主题', 'AI 封面每天 3 次'],
  },
  {
    id: 'monthly' as const,
    name: '月度会员',
    price: '¥19',
    originalPrice: '¥29',
    duration: '30天',
    badge: '首月特惠',
    note: '首购 19 元，后续月度续费恢复原价',
    desc: '适合试用和单月高频排版',
    perks: ['全部模板', '自定义主题', 'AI 封面每天 3 次'],
  },
]

const storage = {
  content: 'formatter-content',
  template: 'formatter-template',
  palette: 'formatter-palette',
  platform: 'formatter-platform',
  themeTab: 'formatter-theme-tab',
}

export default function App() {
  const [content, setContent] = useState(draft)
  const [html, setHtml] = useState('')
  const [platform, setPlatform] = useState<Platform>('wechat')
  const [templateId, setTemplateId] = useState('mint')
  const [paletteId, setPaletteId] = useState('mist')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [showAuth, setShowAuth] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [cycle, setCycle] = useState<BillingCycle>('yearly')
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat')
  const [seed, setSeed] = useState(0)
  const [authPending, setAuthPending] = useState(false)
  const [billingPending, setBillingPending] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [billingError, setBillingError] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const [coverError, setCoverError] = useState('')
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null)
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [drafts, setDrafts] = useState<DraftRecord[]>([])
  const [savedThemes, setSavedThemes] = useState<BrandTheme[]>([])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [draftPending, setDraftPending] = useState(false)
  const [themePending, setThemePending] = useState(false)
  const [coverPending, setCoverPending] = useState(false)
  const [coverMode, setCoverMode] = useState<'demo' | 'live'>('demo')
  const [coverSuggestions, setCoverSuggestions] = useState<AICover[]>([])
  const [themeTab, setThemeTab] = useState<ThemePanelTab>('recommended')
  const [themeNotice, setThemeNotice] = useState('')
  const [editorNotice, setEditorNotice] = useState('')
  const [workSearch, setWorkSearch] = useState('')
  const [workFilter, setWorkFilter] = useState<WorkFilter>('all')
  const [themeForm, setThemeForm] = useState({ name: '', platform: 'all' as Platform | 'all' })
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const deferred = useDeferredValue(content)

  const fallbackEntitlements = useMemo(() => buildFallbackEntitlements(user?.plan), [user?.plan])
  const currentEntitlements = entitlements || fallbackEntitlements
  const accessibleTemplateIds = useMemo(() => new Set(currentEntitlements.accessibleTemplateIds), [currentEntitlements.accessibleTemplateIds])
  const paletteLibrary = useMemo(() => [...palettes, ...savedThemes.map(mapBrandThemeToPalette)], [savedThemes])
  const activeTemplate = templates.find((item) => item.id === templateId) || templates[0]
  const activePalette = paletteLibrary.find((item) => item.id === paletteId) || paletteLibrary[0] || palettes[0]
  const platformTemplates = useMemo(() => templates.filter((item) => item.platforms.includes(platform)), [platform])
  const platformPalettes = useMemo(
    () => paletteLibrary.filter((item) => {
      const inPlatform = item.scope === 'all' || item.scope === platform
      const hasAccess = item.source === 'preset' || currentEntitlements.features.customPalette
      return inPlatform && hasAccess
    }),
    [currentEntitlements.features.customPalette, paletteLibrary, platform],
  )
  const historyDrafts = useMemo(() => {
    const keyword = workSearch.trim().toLowerCase()
    return drafts
      .filter((item) => (workFilter === 'all' ? true : item.platform === workFilter))
      .filter((item) => {
        if (!keyword) {
          return true
        }

        return `${item.title} ${item.content}`.toLowerCase().includes(keyword)
      })
  }, [drafts, workFilter, workSearch])
  const isVip = currentEntitlements.plan === 'vip'
  const title = firstLine(content) || '未命名文章'
  const count = content.replace(/\s/g, '').length
  const minutes = Math.max(1, Math.ceil(count / 320))
  const aiFormattingCharLimit = currentEntitlements.features.aiFormattingCharLimit
  const aiFormattingLimitReached = count > aiFormattingCharLimit
  const canGenerateLiveCover = Boolean(user && currentEntitlements.features.aiImageMode === 'live')
  const canExportMarkdown = currentEntitlements.features.exportFormats.includes('markdown')
  const canExportNoteText = currentEntitlements.features.exportFormats.includes('note-text')
  const subscriptionSummary = buildSubscriptionSummary(subscription)
  const titleSuggestions = platform === 'wechat'
    ? [`${title}：一套真正适合内容团队的排版工作流`, `从写完到发出，${title}还差这一步`, `${title}背后，为什么排版体验决定转化`]
    : [`${title}，终于有人把排版这件事做顺了`, '做小红书内容时，我为什么会先用这套工作台', '一篇内容从草稿到首图发布的完整示范']

  useEffect(() => {
    const savedContent = window.localStorage.getItem(storage.content)
    const savedTemplate = window.localStorage.getItem(storage.template)
    const savedPalette = window.localStorage.getItem(storage.palette)
    const savedPlatform = window.localStorage.getItem(storage.platform)
    const savedThemeTab = window.localStorage.getItem(storage.themeTab)
    const token = authStorage.getToken()

    if (savedContent) setContent(savedContent)
    if (savedTemplate && templates.some((item) => item.id === savedTemplate)) setTemplateId(savedTemplate)
    if (savedPalette) setPaletteId(savedPalette)
    if (savedPlatform === 'wechat' || savedPlatform === 'xiaohongshu') setPlatform(savedPlatform)
    if (savedThemeTab === 'recommended' || savedThemeTab === 'saved') setThemeTab(savedThemeTab)

    void restoreSession(token || undefined)
  }, [])

  useEffect(() => window.localStorage.setItem(storage.content, content), [content])
  useEffect(() => window.localStorage.setItem(storage.template, templateId), [templateId])
  useEffect(() => window.localStorage.setItem(storage.palette, paletteId), [paletteId])
  useEffect(() => window.localStorage.setItem(storage.platform, platform), [platform])
  useEffect(() => window.localStorage.setItem(storage.themeTab, themeTab), [themeTab])

  useEffect(() => {
    if (platformPalettes.some((item) => item.id === paletteId)) {
      return
    }

    if (platformPalettes[0]) {
      setPaletteId(platformPalettes[0].id)
    }
  }, [paletteId, platformPalettes])

  useEffect(() => {
    startTransition(() => setHtml(formatArticle(deferred, activeTemplate.formatterKey, platform)))
  }, [activeTemplate.formatterKey, deferred, platform])

  useEffect(() => {
    if (activeTemplate.platforms.includes(platform)) return
    const fallback = templates.find((item) => item.platforms.includes(platform) && accessibleTemplateIds.has(item.id))
    if (fallback) setTemplateId(fallback.id)
  }, [accessibleTemplateIds, activeTemplate.platforms, platform])

  useEffect(() => {
    setPaymentOrder(null)
    setBillingError('')
  }, [cycle, payMethod])

  useEffect(() => {
    setCoverSuggestions(buildCovers(title, platform, activePalette, seed))
    setCoverMode('demo')
  }, [activePalette, platform, seed, title])

  useEffect(() => {
    if (!exportNotice) {
      return
    }

    const timer = window.setTimeout(() => setExportNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [exportNotice])

  useEffect(() => {
    if (!draftNotice) {
      return
    }

    const timer = window.setTimeout(() => setDraftNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [draftNotice])

  useEffect(() => {
    if (!themeNotice) {
      return
    }

    const timer = window.setTimeout(() => setThemeNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [themeNotice])

  useEffect(() => {
    if (!editorNotice) {
      return
    }

    const timer = window.setTimeout(() => setEditorNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [editorNotice])

  useEffect(() => {
    if (!showPay || !paymentOrder || paymentOrder.status !== 'pending') {
      return
    }

    const token = authStorage.getToken() || undefined

    const timer = window.setInterval(() => {
      void getPaymentOrder(token, paymentOrder.id)
        .then(({ order }) => {
          setPaymentOrder(order)
          if (order.status === 'paid') {
            void restoreSession(token)
          }
        })
        .catch(() => undefined)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [paymentOrder, showPay])

  async function restoreSession(token?: string) {
    try {
      const [currentUser, subscription, nextEntitlements, draftResult, themeResult] = await Promise.all([
        getCurrentUser(token),
        getSubscription(token),
        getEntitlements(token),
        listDrafts(token),
        listThemes(token),
      ])
      setUser({ ...currentUser, plan: subscription.plan })
      setSubscription(subscription)
      setEntitlements(nextEntitlements)
      setDrafts(draftResult.drafts)
      setSavedThemes(themeResult.themes)
    } catch {
      authStorage.clearToken()
      setUser(null)
      setSubscription(null)
      setEntitlements(null)
      setDrafts([])
      setSavedThemes([])
      setActiveDraftId(null)
    } finally {
      setSessionReady(true)
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthPending(true)
    setAuthError('')

    try {
      const result = authMode === 'register'
        ? await register({ name: form.name.trim(), email: form.email, password: form.password })
        : await login({ email: form.email, password: form.password })

      authStorage.setToken(result.token)
      const [subscription, nextEntitlements, draftResult, themeResult] = await Promise.all([
        getSubscription(result.token),
        getEntitlements(result.token),
        listDrafts(result.token),
        listThemes(result.token),
      ])
      setUser({ ...result.user, plan: subscription.plan })
      setSubscription(subscription)
      setEntitlements(nextEntitlements)
      setDrafts(draftResult.drafts)
      setSavedThemes(themeResult.themes)
      setActiveDraftId(null)
      setForm({ name: '', email: '', password: '' })
      setShowAuth(false)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '操作失败，请稍后重试。')
    } finally {
      setAuthPending(false)
      setSessionReady(true)
    }
  }

  async function handleLogout() {
    const token = authStorage.getToken() || undefined

    try {
      await logout(token)
    } catch {
    } finally {
      authStorage.clearToken()
      setUser(null)
      setSubscription(null)
      setEntitlements(null)
      setDrafts([])
      setSavedThemes([])
      setActiveDraftId(null)
      setBillingError('')
      setAuthError('')
      setDraftNotice('')
      setThemeNotice('')
    }
  }

  async function handleCreateOrder() {
    if (!user) {
      setAuthMode('register')
      setShowPay(false)
      setShowAuth(true)
      return
    }

    const token = authStorage.getToken() || undefined

    setBillingPending(true)
    setBillingError('')

    try {
      const result = await createPaymentOrder(token, { method: payMethod, cycle })
      setPaymentOrder(result.order)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '订单创建失败。')
    } finally {
      setBillingPending(false)
    }
  }

  async function handleSimulatePayment() {
    if (!paymentOrder) {
      setBillingError('请先创建订单。')
      return
    }

    const token = authStorage.getToken() || undefined

    setBillingPending(true)
    setBillingError('')

    try {
      const result = await simulatePayment(token, paymentOrder.id)
      setPaymentOrder(result.order)
      setUser(result.user)
      setSubscription(result.subscription)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '支付回调处理失败。')
    } finally {
      setBillingPending(false)
    }
  }

  function selectTemplate(template: Template) {
    if (!accessibleTemplateIds.has(template.id)) {
      setBillingError('')
      setShowPay(true)
      return
    }

    setTemplateId(template.id)
  }

  async function handleGenerateCover() {
    if (!content.trim()) {
      setCoverError('请先输入正文内容，再生成封面。')
      return
    }

    if (!user) {
      setSeed((value) => value + 1)
      setCoverError('当前为演示封面。登录后可使用免费累计 10 次 AI 封面额度。')
      return
    }

    if (!canGenerateLiveCover) {
      setCoverError('当前账号暂不可用 AI 生图，已为你保留演示封面建议。')
      setShowPay(true)
      setSeed((value) => value + 1)
      return
    }

    const token = authStorage.getToken() || undefined

    setCoverPending(true)
    setCoverError('')

    try {
      const result = await generateAICovers(token, {
        title,
        content,
        platform,
        accent: activePalette.accent,
      })
      setCoverSuggestions(result.covers)
      setCoverMode(result.mode)
      if (result.entitlements) {
        setEntitlements(result.entitlements)
      }
      if (result.mode === 'demo') {
        setCoverError('当前未配置真实 AI provider，已回退为演示封面。')
      }
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'AI 封面生成失败。')
    } finally {
      setCoverPending(false)
    }
  }

  function handleEnhanceBody() {
    if (!content.trim()) {
      setEditorNotice('请先输入正文内容，再进行 AI 排版优化。')
      return
    }

    if (aiFormattingLimitReached) {
      setEditorNotice(`当前正文为 ${count} 字，已超过当前方案的 AI 排版上限 ${aiFormattingCharLimit} 字。`)
      return
    }

    setEditorNotice('')
    setContent(enhanceContentWithAI(content))
  }

  async function handleSaveDraft() {
    if (!user) {
      setAuthMode('register')
      setShowAuth(true)
      return
    }

    if (!accessibleTemplateIds.has(templateId)) {
      setDraftNotice('当前模板需要 VIP 权益后才能保存。')
      setShowPay(true)
      return
    }

    const token = authStorage.getToken() || undefined

    setDraftPending(true)
    setDraftNotice('')

    try {
      const payload = {
        title,
        content,
        platform,
        templateId,
        paletteId,
      }

      const result = activeDraftId
        ? await updateDraft(token, activeDraftId, payload)
        : await createDraft(token, payload)

      setDrafts((current) => upsertDraft(current, result.draft))
      setEntitlements(result.entitlements)
      setActiveDraftId(result.draft.id)
      setDraftNotice(activeDraftId ? '草稿已更新。' : '草稿已保存。')
    } catch (error) {
      setDraftNotice(error instanceof Error ? error.message : '草稿保存失败。')
    } finally {
      setDraftPending(false)
    }
  }

  function handleLoadDraft(draft: DraftRecord) {
    if (!accessibleTemplateIds.has(draft.templateId)) {
      setDraftNotice('当前账号暂时没有该模板权限，请先升级 VIP。')
      setShowPay(true)
      return
    }

    setActiveDraftId(draft.id)
    setContent(draft.content)
    setPlatform(draft.platform)
    setTemplateId(draft.templateId)
    setPaletteId(draft.paletteId)
    setDraftNotice('草稿已载入编辑区。')
  }

  async function handleDeleteDraft(draftId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    const token = authStorage.getToken() || undefined

    setDraftPending(true)
    setDraftNotice('')

    try {
      await deleteDraft(token, draftId)
      setDrafts((current) => current.filter((item) => item.id !== draftId))
      if (activeDraftId === draftId) {
        setActiveDraftId(null)
      }
      const nextUsed = Math.max(0, drafts.length - 1)
      setEntitlements((current) => current ? { ...current, features: { ...current.features, draftUsed: nextUsed } } : current)
      setDraftNotice('草稿已删除。')
    } catch (error) {
      setDraftNotice(error instanceof Error ? error.message : '草稿删除失败。')
    } finally {
      setDraftPending(false)
    }
  }

  async function handleSaveTheme() {
    if (!user) {
      setAuthMode('register')
      setShowAuth(true)
      return
    }

    if (!currentEntitlements.features.customPalette) {
      setThemeNotice('品牌主题保存属于 VIP 权益，请先升级后再保存。')
      setShowPay(true)
      return
    }

    const token = authStorage.getToken() || undefined

    if (!themeForm.name.trim()) {
      setThemeNotice('请先填写主题名称。')
      return
    }

    setThemePending(true)
    setThemeNotice('')

    try {
      const result = await createTheme(token, {
        name: themeForm.name.trim(),
        accent: activePalette.accent,
        soft: activePalette.soft,
        glow: activePalette.glow,
        platform: themeForm.platform,
      })
      setSavedThemes((current) => [result.theme, ...current.filter((item) => item.id !== result.theme.id)])
      setPaletteId(result.theme.id)
      setThemeForm({ name: '', platform: 'all' })
      setThemeTab('saved')
      setThemeNotice('品牌主题已保存到你的主题库。')
    } catch (error) {
      setThemeNotice(error instanceof Error ? error.message : '品牌主题保存失败。')
    } finally {
      setThemePending(false)
    }
  }

  async function handleDeleteTheme(themeId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    const token = authStorage.getToken() || undefined

    setThemePending(true)
    setThemeNotice('')

    try {
      await deleteTheme(token, themeId)
      setSavedThemes((current) => current.filter((item) => item.id !== themeId))
      if (paletteId === themeId) {
        setPaletteId(palettes[0].id)
      }
      setThemeNotice('品牌主题已删除。')
    } catch (error) {
      setThemeNotice(error instanceof Error ? error.message : '品牌主题删除失败。')
    } finally {
      setThemePending(false)
    }
  }

  async function handleCopyExport() {
    if (!html) {
      setExportNotice('请先输入内容，再复制导出内容。')
      return
    }

    const exportText = buildExportDocument({
      title,
      platform,
      templateName: activeTemplate.name,
      bodyHtml: html,
    })

    try {
      await copyText(exportText)
      setExportNotice(platform === 'wechat' ? '公众号 HTML 已复制。' : '小红书成稿 HTML 已复制。')
    } catch {
      setExportNotice('复制失败，请改用下载文件。')
    }
  }

  function handleDownloadExport() {
    if (!html) {
      setExportNotice('请先输入内容，再下载导出文件。')
      return
    }

    const exportText = buildExportDocument({
      title,
      platform,
      templateName: activeTemplate.name,
      bodyHtml: html,
    })

    downloadTextFile(
      `${slugifyFileName(title || 'article')}-${platform}.html`,
      exportText,
      'text/html;charset=utf-8',
    )
    setExportNotice(platform === 'wechat' ? '公众号 HTML 已开始下载。' : '小红书成稿文件已开始下载。')
  }

  async function handleCopyStructuredExport() {
    const exportText = platform === 'wechat'
      ? buildMarkdownExportDocument(title, content)
      : buildNoteTextExportDocument(title, content)

    try {
      await copyText(exportText)
      setExportNotice(platform === 'wechat' ? 'Markdown 已复制。' : '小红书发布文案已复制。')
    } catch {
      setExportNotice('复制失败，请改用下载文件。')
    }
  }

  function handleDownloadStructuredExport() {
    const exportText = platform === 'wechat'
      ? buildMarkdownExportDocument(title, content)
      : buildNoteTextExportDocument(title, content)

    downloadTextFile(
      `${slugifyFileName(title || 'article')}-${platform}.${platform === 'wechat' ? 'md' : 'txt'}`,
      exportText,
      'text/plain;charset=utf-8',
    )
    setExportNotice(platform === 'wechat' ? 'Markdown 已开始下载。' : '小红书文案已开始下载。')
  }

  return (
    <div
      className="app-shell min-h-screen"
      style={{ '--accent': activePalette.accent, '--accent-soft': activePalette.soft, '--accent-glow': activePalette.glow } as CSSProperties}
    >
      <div className="mesh-orb mesh-orb-left" />
      <div className="mesh-orb mesh-orb-right" />

      <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(249,246,239,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="brand-mark">猫</div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Paibanmao</p>
              <h1 className="text-lg font-semibold text-slate-900">排版猫 · 双平台内容排版工作台</h1>
            </div>
          </div>

          <nav className="hidden gap-6 text-sm text-slate-600 lg:flex">
            <a href="#workspace">工作台</a>
            <a href="#templates">模板库</a>
            <a href="#history">历史作品</a>
            <a href="#pricing">会员与支付</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 md:block">
                  {user.name} · {isVip ? 'VIP' : '免费版'}
                </div>
                <button type="button" onClick={() => setShowPay(true)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
                  会员中心
                </button>
                <button type="button" onClick={() => void handleLogout()} className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
                  退出
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('')
                    setAuthMode('login')
                    setShowAuth(true)
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
                >
                  {sessionReady ? '登录' : '检查登录中'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('')
                    setAuthMode('register')
                    setShowAuth(true)
                  }}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
                >
                  注册并试用
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 pb-14 pt-8 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activePalette.accent }} />
              参考成熟创作平台的三栏工作台，支持账号与会员状态打通
            </div>

            <div>
              <h2 className="max-w-[10ch] text-4xl font-semibold leading-tight text-slate-950 md:text-[64px]">
                公众号与小红书一体化排版
              </h2>
              <p className="mt-4 max-w-[720px] text-lg leading-8 text-slate-600">
                把模板、编辑、AI 封面、注册登录、会员升级和支付入口整合到同一个创作流程里。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {['双平台排版', '免费 + VIP 模板', 'AI 文章生图', '真实注册登录', '会员状态同步'].map((pill) => (
                <span key={pill} className="rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm text-slate-700 shadow-soft">
                  {pill}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <a href="#workspace" className="rounded-full px-6 py-3 text-sm font-medium text-white shadow-strong" style={{ backgroundColor: activePalette.accent }}>
                进入创作模式
              </a>
              <button type="button" onClick={() => setShowPay(true)} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm">
                查看 VIP 模板与支付
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="模板库" value={`${templates.length} 套`} detail="默认免费 + VIP 收费分层" />
              <Metric label="平台支持" value="2 端" detail="公众号与小红书切换预览" />
              <Metric label="账号状态" value={user ? '已接通' : '待登录'} detail={user ? subscriptionSummary : '当前已切到真实后端鉴权链路'} />
            </div>
          </div>

          <div className="glass-card p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">样式区</p>
                  <span className="rounded-full px-2 py-1 text-[11px] text-slate-700" style={{ backgroundColor: activePalette.soft }}>
                    一键套用
                  </span>
                </div>

                <div className="space-y-3">
                  {templates.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="text-[11px] text-slate-500">{item.tag}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-full rounded-full" style={{ width: `${58 + item.name.length * 4}%`, backgroundColor: activePalette.accent }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-[#fbfbf9] p-5 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">创作模式</p>
                    <p className="text-xs text-slate-500">左侧样式，中间编辑，右侧预览</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px]" style={{ backgroundColor: activePalette.soft }}>
                    {platform === 'wechat' ? '公众号视图' : '小红书视图'}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="space-y-2">
                      <div className="h-3 w-2/3 rounded-full bg-slate-200" />
                      <div className="h-3 rounded-full bg-slate-100" />
                      <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: activePalette.soft }}>
                      <div className="h-3 w-1/2 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="mb-3 h-32 rounded-[18px]" style={{ background: `linear-gradient(135deg, ${activePalette.accent}, #1f2937)` }} />
                      <div className="space-y-2">
                        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="space-y-2">
                        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                        <div className="h-3 w-3/5 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workspace" className="mt-10 section-shell">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Workspace</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-950">三栏排版工作台</h3>
              <p className="mt-2 text-slate-600">左侧管理模板和配色，中间编辑文档，右侧查看封面、标题建议和发布预览。</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {platforms.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlatform(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${platform === item.id ? 'text-white shadow-strong' : 'border border-slate-200 bg-white text-slate-700'}`}
                  style={platform === item.id ? { backgroundColor: activePalette.accent } : undefined}
                >
                  {item.name}
                </button>
              ))}
              <button type="button" onClick={handleEnhanceBody} className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
                AI 一键优化正文
              </button>
              <button type="button" onClick={() => void handleCopyExport()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                {platform === 'wechat' ? '复制 HTML' : '复制成稿'}
              </button>
              <button type="button" onClick={() => handleDownloadExport()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                {platform === 'wechat' ? '下载 HTML' : '下载成稿'}
              </button>
              {(platform === 'wechat' ? canExportMarkdown : canExportNoteText) && (
                <>
                  <button type="button" onClick={() => void handleCopyStructuredExport()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    {platform === 'wechat' ? '复制 Markdown' : '复制发布文案'}
                  </button>
                  <button type="button" onClick={() => handleDownloadStructuredExport()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    {platform === 'wechat' ? '下载 Markdown' : '下载发布文案'}
                  </button>
                </>
              )}
            </div>
            {exportNotice && <p className="text-sm text-slate-500">{exportNotice}</p>}
          </div>

          <div className="editor-grid">
            <aside id="templates" className="workspace-card">
              <div className="workspace-heading">
                <div>
                  <p className="text-sm font-semibold text-slate-900">样式与品牌</p>
                  <p className="mt-1 text-xs text-slate-500">推荐主题、品牌主题和历史作品统一收在这里</p>
                </div>
                <span className="rounded-full px-2 py-1 text-[11px]" style={{ backgroundColor: activePalette.soft }}>
                  {isVip ? 'VIP 已解锁' : '免费版'}
                </span>
              </div>

              <div className="p-5">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setThemeTab('recommended')}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${themeTab === 'recommended' ? 'text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                      style={themeTab === 'recommended' ? { backgroundColor: activePalette.accent } : undefined}
                    >
                      推荐主题
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeTab('saved')}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${themeTab === 'saved' ? 'text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                      style={themeTab === 'saved' ? { backgroundColor: activePalette.accent } : undefined}
                    >
                      我的主题
                    </button>
                  </div>

                  {themeTab === 'recommended' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {platformTemplates.map((item) => {
                          const active = item.id === templateId
                          const locked = !accessibleTemplateIds.has(item.id)

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectTemplate(item)}
                              className={`rounded-2xl border px-3 py-3 text-left ${active ? 'border-transparent text-white shadow-soft' : 'border-slate-200 bg-white text-slate-700'}`}
                              style={active ? { backgroundColor: activePalette.accent } : undefined}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{item.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : locked ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {locked ? 'VIP' : item.tag}
                                </span>
                              </div>
                              <p className={`mt-2 text-xs leading-5 ${active ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.summary}
                              </p>
                            </button>
                          )
                        })}
                      </div>

                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">模板颜色</p>
                            <p className="mt-1 text-xs text-slate-500">参考 Texpeed 的主题切换方式，先选模板再切颜色</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                            {platform === 'wechat' ? '公众号视图' : '小红书视图'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {platformPalettes.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPaletteId(item.id)}
                              className={`color-dot ${paletteId === item.id ? 'color-dot-active' : ''}`}
                              style={{ backgroundColor: item.accent, boxShadow: paletteId === item.id ? `0 0 0 5px ${item.soft}` : undefined }}
                              aria-label={item.name}
                              title={item.name}
                            />
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {platformPalettes.slice(0, 4).map((item) => (
                            <button
                              key={`${item.id}-label`}
                              type="button"
                              onClick={() => setPaletteId(item.id)}
                              className={`rounded-2xl border px-3 py-2 text-left text-xs ${paletteId === item.id ? 'border-transparent text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                              style={paletteId === item.id ? { backgroundColor: item.accent } : undefined}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">保存当前品牌主题</p>
                            <p className="mt-1 text-xs text-slate-500">把当前颜色保存成你自己的长期品牌主题</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] ${currentEntitlements.features.customPalette ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {currentEntitlements.features.customPalette ? 'VIP 可用' : '升级后可用'}
                          </span>
                        </div>

                        <div className="grid gap-3">
                          <Field label="主题名称">
                            <input
                              value={themeForm.name}
                              onChange={(event) => setThemeForm((current) => ({ ...current, name: event.target.value }))}
                              className="field-input"
                              placeholder="例如：品牌主色 / 春季栏目"
                              disabled={themePending}
                            />
                          </Field>
                          <Field label="适用平台">
                            <select
                              value={themeForm.platform}
                              onChange={(event) => setThemeForm((current) => ({ ...current, platform: event.target.value as Platform | 'all' }))}
                              className="field-input"
                              disabled={themePending}
                            >
                              <option value="all">双平台通用</option>
                              <option value="wechat">微信公众号</option>
                              <option value="xiaohongshu">小红书</option>
                            </select>
                          </Field>
                        </div>

                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <span className="h-10 w-10 rounded-2xl" style={{ backgroundColor: activePalette.accent }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{activePalette.name}</p>
                            <p className="text-xs text-slate-500">{activePalette.accent}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleSaveTheme()}
                          disabled={themePending}
                          className="mt-4 w-full rounded-full px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ backgroundColor: activePalette.accent }}
                        >
                          {themePending ? '保存中...' : '保存为我的主题'}
                        </button>

                        {themeNotice && <p className="mt-3 text-xs text-slate-500">{themeNotice}</p>}
                      </div>

                      <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">我的主题库</p>
                          <span className="text-xs text-slate-500">{savedThemes.length}/12</span>
                        </div>
                        <div className="space-y-2">
                          {savedThemes.length ? savedThemes.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${paletteId === item.id ? 'border-transparent text-white shadow-soft' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                              style={paletteId === item.id ? { backgroundColor: item.accent } : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentEntitlements.features.customPalette) {
                                    setShowPay(true)
                                    return
                                  }
                                  setPaletteId(item.id)
                                }}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <span className="h-10 w-10 rounded-2xl border border-white/30" style={{ backgroundColor: item.accent }} />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{item.name}</span>
                                  <span className={`block text-xs ${paletteId === item.id ? 'text-white/75' : 'text-slate-500'}`}>
                                    {item.platform === 'all' ? '双平台通用' : item.platform === 'wechat' ? '公众号' : '小红书'}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(event) => void handleDeleteTheme(item.id, event)}
                                className={`rounded-full px-2 py-1 text-[11px] ${paletteId === item.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500'}`}
                              >
                                删除
                              </button>
                            </div>
                          )) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500">
                              还没有保存主题。建议先选中喜欢的模板色，再保存成你的品牌主题。
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3 rounded-[24px] border border-slate-200 bg-white p-4">
                  <Setting label="字体" value={platform === 'wechat' ? '常规黑体' : '笔记圆体'} />
                  <Setting label="字号" value={platform === 'wechat' ? '适中 (16号)' : '偏大 (17号)'} />
                  <Setting label="行间距" value={platform === 'wechat' ? '适中 (2.0X)' : '舒展 (2.2X)'} />
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">草稿箱</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user
                          ? `已使用 ${drafts.length}/${currentEntitlements.features.draftLimit} 个草稿位`
                          : '登录后可保存草稿和继续编辑'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft()}
                      disabled={draftPending}
                      className="rounded-full px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: activePalette.accent }}
                    >
                      {draftPending ? '保存中...' : activeDraftId ? '更新草稿' : '保存草稿'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {drafts.length ? (
                      drafts.slice(0, 4).map((draft) => (
                        <div
                          key={draft.id}
                          className={`flex items-start justify-between rounded-2xl border px-3 py-3 ${
                            activeDraftId === draft.id ? 'border-transparent text-white shadow-soft' : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                          style={activeDraftId === draft.id ? { backgroundColor: activePalette.accent } : undefined}
                        >
                          <button type="button" onClick={() => handleLoadDraft(draft)} className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium">{draft.title}</p>
                            <p className={`mt-1 text-xs ${activeDraftId === draft.id ? 'text-white/75' : 'text-slate-500'}`}>
                              {draft.platform === 'wechat' ? '公众号' : '小红书'} · {templates.find((item) => item.id === draft.templateId)?.name || draft.templateId}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => void handleDeleteDraft(draft.id, event)}
                            className={`ml-3 rounded-full px-2 py-1 text-[11px] ${
                              activeDraftId === draft.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500'
                            }`}
                          >
                            删除
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500">
                        还没有历史作品。建议先用当前模板整理好正文，再保存一份到历史作品库。
                      </div>
                    )}
                  </div>

                  {draftNotice && <p className="mt-3 text-xs text-slate-500">{draftNotice}</p>}
                </div>

                <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">会员功能入口</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    当前权益：{isVip ? '已解锁全部模板、真实 AI 生图和扩展导出。' : '可用免费模板和基础 HTML 导出，VIP 可解锁更多模板与 AI。'}
                  </p>
                  {subscription && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {subscriptionSummary}
                    </p>
                  )}
                  <button type="button" onClick={() => setShowPay(true)} className="mt-3 rounded-full px-4 py-2 text-sm text-white" style={{ backgroundColor: activePalette.accent }}>
                    {isVip ? '管理会员' : '升级 VIP'}
                  </button>
                </div>
              </div>
            </aside>

            <section className="workspace-card">
              <div className="workspace-heading">
                <div>
                  <p className="text-sm font-semibold text-slate-900">文档编辑区</p>
                  <p className="mt-1 text-xs text-slate-500">支持粘贴文章原文，后续可继续接草稿箱和智能改写</p>
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">字数 {count}</span>
                  <span className={`rounded-full border px-3 py-1.5 ${aiFormattingLimitReached ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    AI 排版 {count}/{aiFormattingCharLimit}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">预计阅读 {minutes} 分钟</span>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">排版建议</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      当前内容更适合
                      <span className="mx-1 font-semibold" style={{ color: activePalette.accent }}>
                        {platform === 'wechat' ? '深度文章结构' : '笔记节奏结构'}
                      </span>
                      ，建议先优化标题和首段，再生成封面图。
                    </p>
                    <p className={`mt-2 text-xs ${aiFormattingLimitReached ? 'text-rose-600' : 'text-slate-500'}`}>
                      当前方案 AI 排版上限 {aiFormattingCharLimit} 字。{aiFormattingLimitReached ? '当前内容已超出上限，请精简正文或升级会员。' : '当前内容可直接使用 AI 一键优化正文。'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenerateCover()}
                    disabled={coverPending}
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {coverPending ? '生成中...' : canGenerateLiveCover ? '生成 AI 封面' : '刷新演示封面'}
                  </button>
                </div>
              </div>

              {editorNotice && (
                <div className="border-b border-slate-200 px-5 py-3">
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{editorNotice}</p>
                </div>
              )}

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="粘贴公众号文章、小红书笔记或运营草稿，系统会根据模板实时生成预览。"
                className="min-h-[760px] w-full resize-none bg-white px-6 py-6 text-[16px] leading-8 text-slate-800 outline-none placeholder:text-slate-400"
                spellCheck={false}
              />
            </section>

            <aside className="workspace-card">
              <div className="workspace-heading">
                <div>
                  <p className="text-sm font-semibold text-slate-900">封面、标题与预览</p>
                  <p className="mt-1 text-xs text-slate-500">聚合 AI 封面、标题推荐、成稿预览和发布清单</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateCover()}
                  disabled={coverPending}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {coverPending ? '生成中...' : coverMode === 'live' ? '重新生成' : '刷新建议'}
                </button>
              </div>

              <div className="preview-stack">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">AI 封面推荐</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] ${coverMode === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {coverMode === 'live' ? 'AI Live' : 'Demo'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {currentEntitlements.features.aiImageQuota.limitType === 'daily'
                          ? `腾讯混元优先 · 今日剩余 ${currentEntitlements.features.aiImageQuota.remaining} 次`
                          : `腾讯混元优先 · 累计剩余 ${currentEntitlements.features.aiImageQuota.remaining} 次`}
                      </span>
                    </div>
                  </div>
                  {coverError && <p className="mb-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">{coverError}</p>}
                  <div className="space-y-3">
                    {coverSuggestions.map((item, index) => (
                      <div key={item.id} className="cover-frame">
                        <img src={item.image} alt={item.title} className="h-[190px] w-full rounded-[20px] object-cover" />
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">{index === 0 ? '推荐封面' : `备选方案 ${index}`}</p>
                            <span className="text-[11px] text-slate-500">{platform === 'wechat' ? '公众号' : '小红书'}</span>
                          </div>
                          <p className="text-xs leading-5 text-slate-500">{item.prompt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">推荐标题</p>
                    <a href="#pricing" className="text-xs font-medium" style={{ color: activePalette.accent }}>
                      查看会员标题库
                    </a>
                  </div>
                  <ol className="space-y-3 text-sm leading-6 text-slate-700">
                    {titleSuggestions.map((item, index) => (
                      <li key={item} className="flex gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                        <span className="font-semibold text-slate-400">{index + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">成稿预览</p>
                    <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ backgroundColor: activePalette.soft }}>
                      {platform === 'wechat' ? '公众号文章' : '小红书笔记'}
                    </span>
                  </div>
                  <div className={`device-preview ${platform === 'xiaohongshu' ? 'device-preview-note' : ''}`}>
                    <div className="device-preview-header">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                        <p className="mt-1 text-xs text-slate-500">{activeTemplate.name} · 实时更新</p>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[10px] font-medium text-white" style={{ backgroundColor: activePalette.accent }}>
                        实时
                      </span>
                    </div>
                    <div className="device-preview-body">
                      {html ? (
                        <div dangerouslySetInnerHTML={{ __html: html }} />
                      ) : (
                        <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-400">
                          输入内容后这里会显示实时排版预览
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-base font-semibold text-slate-900">发布清单</p>
                  <div className="mt-3 space-y-3">
                    <Checklist text="已完成正文结构化排版" />
                    <Checklist text={`已切换到${platform === 'wechat' ? '公众号' : '小红书'}发布视图`} />
                    <Checklist text={coverMode === 'live' ? '已生成真实 AI 封面建议' : '已生成 3 版演示封面建议'} />
                    <Checklist text={isVip ? '会员状态已由后端同步，可直接使用 VIP 模板与扩展导出' : '当前为免费版，可继续升级解锁 VIP 模板与 AI'} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="history" className="mt-10 section-shell">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">History</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-950">历史作品页</h3>
              <p className="mt-2 text-slate-600">把已保存的作品按平台和关键词重新筛出来，快速回到编辑态继续修改。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={workSearch}
                onChange={(event) => setWorkSearch(event.target.value)}
                className="field-input w-[240px]"
                placeholder="搜索标题或正文关键词"
              />
              <div className="flex gap-2 rounded-full border border-slate-200 bg-white p-1">
                {(['all', 'wechat', 'xiaohongshu'] as WorkFilter[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setWorkFilter(item)}
                    className={`rounded-full px-4 py-2 text-sm ${workFilter === item ? 'text-white' : 'text-slate-600'}`}
                    style={workFilter === item ? { backgroundColor: activePalette.accent } : undefined}
                  >
                    {item === 'all' ? '全部' : item === 'wechat' ? '公众号' : '小红书'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.74fr_1.26fr]">
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-slate-900">作品概览</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Setting label="总作品数" value={`${drafts.length}`} />
                <Setting label="公众号作品" value={`${drafts.filter((item) => item.platform === 'wechat').length}`} />
                <Setting label="小红书作品" value={`${drafts.filter((item) => item.platform === 'xiaohongshu').length}`} />
              </div>
              <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                历史作品当前直接复用后端草稿接口，后面如果要做正式“已发布作品库”，可以再拆成独立的作品表和状态流转。
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">作品列表</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  当前筛出 {historyDrafts.length} 篇
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {historyDrafts.length ? historyDrafts.map((item) => {
                  const templateName = templates.find((entry) => entry.id === item.templateId)?.name || item.templateId
                  const paletteName = paletteLibrary.find((entry) => entry.id === item.paletteId)?.name || item.paletteId

                  return (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.platform === 'wechat' ? '公众号' : '小红书'} · {templateName}
                          </p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-[11px]" style={{ backgroundColor: activePalette.soft }}>
                          {paletteName}
                        </span>
                      </div>
                      <p className="history-excerpt mt-3 text-sm leading-6 text-slate-600">{item.content}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDateTime(item.updatedAt)}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadDraft(item)}
                            className="rounded-full px-3 py-2 text-white"
                            style={{ backgroundColor: activePalette.accent }}
                          >
                            继续编辑
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 md:col-span-2">
                    还没有匹配到作品，先保存一篇内容，或者换个关键词再试。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mt-10 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="section-shell">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Monetization</p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-950">注册、会员与支付</h3>
              </div>
              <button type="button" onClick={() => setShowPay(true)} className="rounded-full px-4 py-2 text-sm text-white" style={{ backgroundColor: activePalette.accent }}>
                打开支付弹层
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCycle(item.id)}
                  className={`rounded-[28px] border p-5 text-left ${cycle === item.id ? 'border-transparent bg-slate-950 text-white shadow-strong' : 'border-slate-200 bg-white text-slate-800'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{item.name}</p>
                      <p className={`mt-2 text-sm ${cycle === item.id ? 'text-white/70' : 'text-slate-400 line-through'}`}>{item.originalPrice}</p>
                      <p className="mt-1 text-3xl font-semibold">{item.price}</p>
                      <p className={`mt-2 text-sm ${cycle === item.id ? 'text-white/80' : 'text-slate-500'}`}>{item.duration}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${cycle === item.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${cycle === item.id ? 'text-white/75' : 'text-slate-500'}`}>{item.desc}</p>
                  <p className={`mt-2 text-xs ${cycle === item.id ? 'text-white/70' : 'text-slate-400'}`}>{item.note}</p>
                  <div className="mt-4 space-y-2">
                    {item.perks.map((perk) => (
                      <div key={perk} className={`rounded-2xl px-3 py-2 text-sm ${cycle === item.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-700'}`}>
                        {perk}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
              <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700">
                <span>功能</span>
                <span>免费用户</span>
                <span>会员用户</span>
              </div>
              {[
                ['AI排版字数', '3000字内', '10000字内'],
                ['文档写作', '无限制', '无限制'],
                ['排版主题样式', '部分可用', '全部可用'],
                ['自定义主题样式', '不可用', '全部可用'],
                ['AI生成封面', '累计10次', '每天3次'],
              ].map(([label, freeText, vipText]) => (
                <div key={label} className="grid grid-cols-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-600 last:border-b-0">
                  <span className="font-medium text-slate-800">{label}</span>
                  <span>{freeText}</span>
                  <span className="font-medium" style={{ color: activePalette.accent }}>{vipText}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-shell">
            <div className="mb-5">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Checkout</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-950">支付方式与接入预留</h3>
              <p className="mt-2 text-slate-600">当前版本会优先读取真实 .env 商户参数生成正式订单，缺少参数时自动回退到本地测试流程。</p>
            </div>

            <div className="space-y-4">
              {(['wechat', 'alipay'] as PayMethod[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPayMethod(item)}
                  className={`flex w-full items-center justify-between rounded-[24px] border px-5 py-4 text-left ${payMethod === item ? 'border-transparent text-white shadow-soft' : 'border-slate-200 bg-white text-slate-800'}`}
                  style={payMethod === item ? { backgroundColor: activePalette.accent } : undefined}
                >
                  <div>
                    <p className="text-base font-semibold">{item === 'wechat' ? '微信支付' : '支付宝'}</p>
                    <p className={`mt-1 text-sm ${payMethod === item ? 'text-white/80' : 'text-slate-500'}`}>
                      {item === 'wechat' ? '适合公众号生态内完成闭环支付。' : '适合网页端与独立站收款。'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${payMethod === item ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {payMethod === item ? '已选中' : '点击切换'}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">当前后端接口</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="rounded-2xl bg-white px-3 py-2">POST /api/auth/register 与 /api/auth/login</div>
                <div className="rounded-2xl bg-white px-3 py-2">GET /api/auth/me 获取当前用户</div>
                <div className="rounded-2xl bg-white px-3 py-2">GET /api/user/subscription 获取会员状态</div>
                <div className="rounded-2xl bg-white px-3 py-2">POST /api/payments/create-order 创建正式或回退订单</div>
                <div className="rounded-2xl bg-white px-3 py-2">POST /api/payments/callback/:provider 接收官方回调验签</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showAuth && (
        <Modal onClose={() => !authPending && setShowAuth(false)}>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{authMode === 'login' ? 'Login' : 'Register'}</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">{authMode === 'login' ? '登录工作台' : '注册并开始排版'}</h3>
            </div>
            <button type="button" onClick={() => !authPending && setShowAuth(false)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">
              关闭
            </button>
          </div>

          <form className="space-y-4" onSubmit={(event) => void submitAuth(event)}>
            {authMode === 'register' && (
              <Field label="昵称">
                <input
                  value={form.name}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  className="field-input"
                  placeholder="输入你的品牌名或昵称"
                  disabled={authPending}
                />
              </Field>
            )}

            <Field label="邮箱">
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                className="field-input"
                placeholder="creator@example.com"
                disabled={authPending}
              />
            </Field>

            <Field label="密码">
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                className="field-input"
                placeholder="至少 8 位密码"
                disabled={authPending}
              />
            </Field>

            {authError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{authError}</p>}

            <button type="submit" disabled={authPending} className="w-full rounded-full px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: activePalette.accent }}>
              {authPending ? '提交中...' : authMode === 'login' ? '登录' : '注册并进入工作台'}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-500">
            {authMode === 'login' ? '还没有账号？' : '已经有账号了？'}
            <button
              type="button"
              onClick={() => {
                setAuthError('')
                setAuthMode(authMode === 'login' ? 'register' : 'login')
              }}
              className="ml-2 font-medium"
              style={{ color: activePalette.accent }}
            >
              {authMode === 'login' ? '立即注册' : '去登录'}
            </button>
          </div>
        </Modal>
      )}

      {showPay && (
        <Modal onClose={() => !billingPending && setShowPay(false)} wide>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">VIP</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">模板升级与支付</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">已支持读取 .env 商户参数创建真实订单；如果本地未配置参数，会自动回退到可测试的模拟链路。</p>
              {subscription && <p className="mt-2 text-sm leading-6 text-slate-500">{subscriptionSummary}</p>}
            </div>
            <button type="button" onClick={() => !billingPending && setShowPay(false)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">
              关闭
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCycle(item.id)}
                className={`rounded-[26px] border p-5 text-left ${cycle === item.id ? 'border-transparent text-white shadow-soft' : 'border-slate-200 bg-white text-slate-800'}`}
                style={cycle === item.id ? { backgroundColor: activePalette.accent } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{item.name}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${cycle === item.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {item.badge}
                  </span>
                </div>
                <p className={`mt-3 text-xs ${cycle === item.id ? 'text-white/70' : 'text-slate-400 line-through'}`}>{item.originalPrice}</p>
                <p className="mt-1 text-3xl font-semibold">{item.price}</p>
                <p className={`mt-2 text-sm ${cycle === item.id ? 'text-white/80' : 'text-slate-500'}`}>{item.duration}</p>
                <p className={`mt-2 text-sm leading-6 ${cycle === item.id ? 'text-white/80' : 'text-slate-500'}`}>{item.desc}</p>
                <p className={`mt-2 text-xs ${cycle === item.id ? 'text-white/70' : 'text-slate-400'}`}>{item.note}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(['wechat', 'alipay'] as PayMethod[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPayMethod(item)}
                className={`rounded-[22px] border px-4 py-4 text-left ${payMethod === item ? 'border-transparent bg-slate-950 text-white shadow-soft' : 'border-slate-200 bg-white text-slate-800'}`}
              >
                <p className="text-base font-semibold">{item === 'wechat' ? '微信支付' : '支付宝'}</p>
                <p className={`mt-2 text-sm ${payMethod === item ? 'text-white/75' : 'text-slate-500'}`}>
                  {item === 'wechat' ? '适合扫码与公众号支付链路。' : '适合网页端独立完成支付。'}
                </p>
              </button>
            ))}
          </div>

          {paymentOrder && (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">当前订单</p>
                  <p className="mt-1 text-xs text-slate-500">订单号：{paymentOrder.providerOrderId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${paymentOrder.checkout.mode === 'live' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                    {paymentOrder.checkout.mode === 'live' ? '正式网关' : '本地回退'}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                    paymentOrder.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : paymentOrder.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {paymentOrder.status === 'paid' ? '已支付' : paymentOrder.status === 'pending' ? '待支付' : paymentOrder.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  {paymentOrder.checkout.mode === 'live' ? 'Live Checkout' : 'Mock Checkout'}
                </p>
                <p className="mt-2 text-sm text-slate-700">{paymentOrder.checkout.instructions}</p>
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
                  {paymentOrder.checkout.qrCodeText}
                </div>
                <p className="mt-3 text-xs text-slate-500 break-all">{paymentOrder.checkout.paymentUrl}</p>
                {paymentOrder.checkout.callbackUrl && (
                  <p className="mt-2 text-xs text-slate-500 break-all">回调地址：{paymentOrder.checkout.callbackUrl}</p>
                )}
              </div>
            </div>
          )}

          {billingError && <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{billingError}</p>}

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  当前选择: {plans.find((item) => item.id === cycle)?.name || '会员'} · {payMethod === 'wechat' ? '微信支付' : '支付宝'}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  先创建订单，再通过支付回调把订单状态置为已支付，并同步开通会员。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCreateOrder()}
                  disabled={billingPending}
                  className="rounded-full px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: activePalette.accent }}
                >
                  {billingPending ? '处理中...' : paymentOrder ? '重新创建订单' : user ? '创建订单' : '先注册再下单'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSimulatePayment()}
                  disabled={billingPending || !paymentOrder || paymentOrder.status === 'paid' || paymentOrder.checkout.mode === 'live'}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentOrder?.checkout.mode === 'live'
                    ? '等待官方回调'
                    : paymentOrder?.status === 'paid'
                      ? '支付已完成'
                      : '模拟支付回调'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  )
}

function Checklist({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
      <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
        ✓
      </span>
      <span>{text}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className={`modal-card ${wide ? 'max-w-[720px]' : ''}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function buildCovers(title: string, platform: Platform, palette: Palette, seed: number) {
  const moods = [
    ['极简主视觉', platform === 'wechat' ? '适合品牌公众号头图' : '适合笔记首图封面', '#1f2937'],
    ['信息型封面', platform === 'wechat' ? '更突出标题与知识感' : '更突出点击与清单感', '#3f3f46'],
    ['故事感海报', platform === 'wechat' ? '适合人物与案例文章' : '适合生活方式内容', '#172554'],
  ] as const

  return moods.map((item, index) => ({
    id: `${item[0]}-${seed}-${index}`,
    title: item[0],
    prompt: `${item[1]}，根据正文自动生成的 AI 封面方案。`,
    image: coverSvg(title, item[1], palette.accent, moods[(index + seed) % moods.length][2]),
  }))
}

function coverSvg(title: string, subtitle: string, accent: string, end: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs>
      <rect width="1200" height="720" rx="44" fill="url(#g)"/>
      <rect x="72" y="72" width="1056" height="576" rx="36" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)"/>
      <text x="96" y="158" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="30" opacity=".85">AI Cover Concept</text>
      <text x="96" y="320" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="76" font-weight="700">${escapeXml(title.replace(/^#+\s*/, '').slice(0, 24))}</text>
      <text x="96" y="396" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="34" opacity=".88">${escapeXml(subtitle.slice(0, 24))}</text>
      <rect x="96" y="466" width="192" height="56" rx="28" fill="rgba(255,255,255,.16)"/>
      <text x="132" y="503" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="24">内容排版</text>
    </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function buildExportDocument({
  title,
  platform,
  templateName,
  bodyHtml,
}: {
  title: string
  platform: Platform
  templateName: string
  bodyHtml: string
}) {
  const modeLabel = platform === 'wechat' ? '微信公众号排版导出' : '小红书笔记排版导出'

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeXml(title || '未命名文章')}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px 16px;
        background: #f8fafc;
        color: #0f172a;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .page {
        max-width: 880px;
        margin: 0 auto;
      }
      .meta {
        margin-bottom: 18px;
        padding: 18px 20px;
        border-radius: 20px;
        background: white;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
      }
      .meta p {
        margin: 0;
      }
      .meta .kicker {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #64748b;
      }
      .meta .title {
        margin-top: 10px;
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
      }
      .meta .sub {
        margin-top: 8px;
        font-size: 14px;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="meta">
        <p class="kicker">${modeLabel}</p>
        <p class="title">${escapeXml(title || '未命名文章')}</p>
        <p class="sub">模板：${escapeXml(templateName)}</p>
      </section>
      ${bodyHtml}
    </main>
  </body>
</html>`
}

function buildMarkdownExportDocument(title: string, content: string) {
  const normalized = content.trim()
  if (!normalized) {
    return `# ${title || '未命名文章'}\n`
  }

  if (/^#\s+/.test(normalized)) {
    return normalized
  }

  return `# ${title || '未命名文章'}\n\n${normalized}`
}

function buildNoteTextExportDocument(title: string, content: string) {
  const normalized = content.trim()
  const tags = Array.from(new Set((content.match(/#[^\s#]{2,18}/g) || []).slice(0, 5)))
  const footer = tags.length ? `\n\n${tags.join(' ')}` : '\n\n#小红书笔记 #内容排版'
  return `${title || '未命名笔记'}\n\n${normalized}${footer}`
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function slugifyFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'article'
}

function buildFallbackEntitlements(plan?: string): UserEntitlements {
  const normalizedPlan = plan === 'vip' ? 'vip' : 'free'
  return {
    plan: normalizedPlan,
    accessibleTemplateIds: templates
      .filter((item) => normalizedPlan === 'vip' || item.tier === 'free')
      .map((item) => item.id),
    features: {
      aiImageMode: 'live',
      aiImageProvider: 'tencent-hunyuan',
      aiImageQuota: normalizedPlan === 'vip'
        ? { limitType: 'daily', limit: 3, used: 0, remaining: 3 }
        : { limitType: 'lifetime', limit: 10, used: 0, remaining: 10 },
      aiFormattingCharLimit: normalizedPlan === 'vip' ? 10000 : 3000,
      draftLimit: normalizedPlan === 'vip' ? 50 : 3,
      draftUsed: 0,
      exportFormats: normalizedPlan === 'vip' ? ['html', 'markdown', 'note-text'] : ['html'],
      customPalette: normalizedPlan === 'vip',
    },
  }
}

function mapBrandThemeToPalette(theme: BrandTheme): Palette {
  return {
    id: theme.id,
    name: theme.name,
    accent: theme.accent,
    soft: theme.soft,
    glow: theme.glow,
    scope: theme.platform,
    source: 'saved',
  }
}

function upsertDraft(current: DraftRecord[], draft: DraftRecord) {
  const next = [draft, ...current.filter((item) => item.id !== draft.id)]
  return next.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function buildSubscriptionSummary(subscription: SubscriptionInfo | null) {
  if (!subscription) {
    return '会员状态将随登录后接口同步。'
  }

  if (subscription.plan !== 'vip') {
    return '当前为免费版，可升级月度、季度或年度会员。'
  }

  const cycleLabel = subscription.cycle === 'yearly'
    ? '年度会员'
    : subscription.cycle === 'quarterly'
      ? '季度会员'
      : subscription.cycle === 'monthly'
        ? '月度会员'
        : '会员'
  const expiresLabel = subscription.expiresAt ? formatDateTime(subscription.expiresAt) : '待同步'
  return `当前为 VIP ${cycleLabel}，有效期至 ${expiresLabel}。`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function firstLine(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
}
