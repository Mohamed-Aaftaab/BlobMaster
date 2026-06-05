import { DocsChrome } from '@/components/docs/DocsChrome'

export default function DevDocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <DocsChrome>{children}</DocsChrome>
}
