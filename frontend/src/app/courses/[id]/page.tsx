import Link from 'next/link';

interface CourseDetailPageProps {
  params: { id: string };
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  return (
    <div className="content-container home-content">
      <section className="content-section">
        <Link className="text-link" href="/courses">← Back to courses</Link>
        <h1 style={{ marginTop: 18 }}>Course Detail — {params.id}</h1>
        {/* Course detail content */}

        <section aria-labelledby="video-title" style={{ marginTop: 32 }}>
          <h2 id="video-title">Video thử nghiệm: YouTube</h2>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 720,
              aspectRatio: '16 / 9',
              marginTop: 16,
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/9mUeW-VG73c?si=WVM0mxKpHdND2Cav"
              title="YouTube video player — 9mUeW-VG73c"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>
        </section>
      </section>
    </div>
  );
}
