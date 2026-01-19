interface MobileTabsProps {
  activeTab: 'chat' | 'users' | 'info'
  onTabChange: (tab: 'chat' | 'users' | 'info') => void
  unreadCount?: number
}

export const MobileTabs = ({ activeTab, onTabChange }: MobileTabsProps) => {
  const tabs = [
    {
      id: 'chat',
      label: '聊天',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      id: 'users',
      label: '成员',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: 'info',
      label: '设置',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ] as const

  return (
    <div className="flex shrink-0 border-b border-gray-100 bg-white">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
            activeTab === tab.id
              ? 'bg-indigo-50/50 text-indigo-600'
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      ))}
    </div>
  )
}
