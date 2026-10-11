interface CourseDetailPageProps {
  params: { id: string };
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  return (
    <section>
      <h1>Course Detail — {params.id}</h1>
      {/* Course detail content */}
    </section>
  );
}
