/**
 * CoverGallery — main cover image + secondary back-cover thumbnail.
 * Purely presentational; receives URLs as props.
 */
import { BookCover } from '@/components/ui'

interface CoverGalleryProps {
  title: string
  mainCoverUrl: string
  backCoverUrl?: string
}

export function CoverGallery({ title, mainCoverUrl, backCoverUrl }: CoverGalleryProps) {
  return (
    <figure className="flex gap-3 items-end" aria-label="Book cover images">
      {/* Main large cover */}
      <BookCover
        title={title}
        coverUrl={mainCoverUrl || undefined}
        size="lg"
        className="shrink-0"
      />

      {/* Back-cover / preview thumbnail */}
      <div className="relative shrink-0">
        <BookCover
          title={`${title} — back cover`}
          coverUrl={backCoverUrl || undefined}
          size="md"
          className="opacity-90"
        />
        {/* Magnifier affordance matching the screenshot */}
        <span
          className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
          aria-hidden="true"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
      </div>
    </figure>
  )
}
