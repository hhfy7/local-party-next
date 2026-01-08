interface MobileTabsProps {
  activeTab: 'chat' | 'users' | 'info'
  onTabChange: (tab: 'chat' | 'users' | 'info') => void
  unreadCount?: number // 可选：未来扩展未读消息
}

export const MobileTabs = ({ activeTab, onTabChange }: MobileTabsProps) => {
  const tabs = [
    { id: 'chat', label: '聊天', icon: '💬' },
    { id: 'users', label: '成员', icon: '👥' },
    { id: 'info', label: '设置', icon: '⚙️' },
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
