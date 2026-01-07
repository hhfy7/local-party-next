import { ChangeEvent } from 'react'

interface VideoEmptyStateProps {
  cachedFileHandle: FileSystemFileHandle | null
  onRestore: () => void
  onPick: () => void
  onInputSelect: (e: ChangeEvent<HTMLInputElement>) => void
}

export const VideoEmptyState = ({
  cachedFileHandle,
  onRestore,
  onPick,
  onInputSelect,
}: VideoEmptyStateProps) => {
  return (
    <div className="relative w-full max-w-2xl">
      {/* 背景光效 */}
      <div className="animate-pulse-slow absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl"></div>

      <div className="animate-fade-in-up text-center">
        <div className="rounded-[3rem] border border-white bg-white/80 p-12 shadow-2xl ring-1 ring-white/50 backdrop-blur-xl">
          {/* 图标 */}
          <div className="animate-float mx-auto mb-10 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-50 to-white shadow-lg ring-4 shadow-indigo-100 ring-indigo-50">
            <svg
              className="ml-1 h-12 w-12 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* 内容切换 */}
          {cachedFileHandle ? (
            <div>
              <h2 className="mb-3 text-3xl font-black tracking-tight text-gray-900">
                欢迎回来
              </h2>
              <p className="mb-10 text-lg text-gray-500">
                上次观看{' '}
                <span className="mx-1 rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-600">
                  {cachedFileHandle.name}
                </span>
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  onClick={onRestore}
                  className="rounded-2xl bg-indigo-600 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 hover:bg-indigo-700 hover:shadow-indigo-300 active:translate-y-0"
                >
                  继续播放
                </button>
                <button
                  onClick={onPick}
                  className="rounded-2xl border border-gray-200 bg-white px-10 py-4 text-lg font-bold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
                >
                  更换视频
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-3xl font-black tracking-tight text-gray-900">
                准备就绪
              </h2>
              <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-gray-500">
                选择本地视频文件，即刻开启
                <br />
                <span className="font-medium text-indigo-500">
                  无损画质
                </span>{' '}
                的异地同步观影体验
              </p>
              <button
                onClick={onPick}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-900 px-12 py-5 text-lg font-bold text-white shadow-2xl transition-all hover:-translate-y-1 hover:bg-gray-800 hover:shadow-gray-400/50 active:translate-y-0"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                <span className="relative flex items-center gap-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  选择视频文件
                </span>
              </button>
            </>
          )}
          <input
            id="hidden-file-input"
            type="file"
            accept="video/*"
            onChange={onInputSelect}
            className="hidden"
          />
        </div>

        <p className="mt-8 text-xs font-medium tracking-wide text-gray-400 uppercase opacity-60">
          Secure Local Playback • No Upload
        </p>
      </div>
    </div>
  )
}
