/**
 * AuthorCard — "About the writer" section with avatar, name, and bio.
 * Purely presentational.
 */
import { Card, Heading, Text } from '@/components/ui'

interface AuthorCardProps {
  authorName: string
  authorBio: string | null
  avatarUrl: string | null
}

export function AuthorCard({ authorName, authorBio, avatarUrl }: AuthorCardProps) {
  /** Generate initials fallback from the author's name */
  const initials = authorName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <section aria-label="About the writer">
      <Heading as="h2" size="h5" className="mb-3">
        About the writer
      </Heading>

      <Card variant="default" padding="md">
        <div className="flex gap-4 items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={authorName}
                loading="lazy"
                decoding="async"
                className="w-14 h-14 rounded-full object-cover bg-[var(--color-bg-elevated)]"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-base font-semibold text-[var(--color-text-muted)]"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
          </div>

          {/* Name + bio */}
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{authorName}</p>
            {authorBio && (
              <Text as="p" size="sm" muted className="leading-relaxed">
                {authorBio}
              </Text>
            )}
          </div>
        </div>
      </Card>
    </section>
  )
}
