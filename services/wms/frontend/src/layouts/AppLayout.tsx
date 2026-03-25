import { ReactNode } from 'react'

type Props = {
  sidebar: ReactNode
  children: ReactNode
}

export function AppLayout({ sidebar, children }: Props) {
  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <aside className="bg-cl-dark border-r border-cl-panel h-screen overflow-y-auto p-6 flex flex-col">
        {sidebar}
      </aside>
      <main className="bg-cl-navy overflow-y-auto p-6">{children}</main>
    </div>
  )
}
