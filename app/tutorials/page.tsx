import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/shared/ui/button';

export default function Tutorials() {
  const tutorials = [
    { title: "Introduction to WebGL", difficulty: "Beginner", slug: "intro-to-webgl" },
    { title: "Creating Your First 3D Scene", difficulty: "Beginner", slug: "first-3d-scene" },
    { title: "Understanding Shaders", difficulty: "Intermediate", slug: "understanding-shaders" },
    { title: "Advanced Lighting Techniques", difficulty: "Advanced", slug: "advanced-lighting" },
    { title: "Implementing Post-Processing Effects", difficulty: "Advanced", slug: "post-processing" },
    { title: "Building a WebGL Game", difficulty: "Advanced", slug: "webgl-game" },
  ];

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">WebGL Tutorials</h1>
        <p className="mb-8">Explore our collection of interactive WebGL tutorials and level up your 3D graphics programming skills.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((tutorial) => (
            <div key={tutorial.slug} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">{tutorial.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Difficulty: {tutorial.difficulty}</p>
              <Button variant="primary" asChild>
                <a href={`/tutorials/${tutorial.slug}`}>Start Tutorial</a>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}