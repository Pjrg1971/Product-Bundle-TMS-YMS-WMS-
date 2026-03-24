import { ReactNode } from 'react'

type Props = {
  sidebar: ReactNode
  children: ReactNode
}

export function AppLayout({ sidebar, children }: Props) {
  return (
    <div className="layout">
      <aside className="sidebar">{sidebar}</aside>
      <main className="content">{children}</main>
    </div>
  )
}
