import {
  BoxIcon,
  CodeIcon,
  BookOpenIcon,
  RocketIcon,
  GraduationCapIcon,
} from 'lucide-react';

import { LandingPrimaryImageCtaSection } from '@/components/landing/cta/LandingPrimaryCta';
import { LandingProductFeaturesGrid } from '@/components/landing/LandingProductFeaturesGrid';
import { LandingProductFeature } from '@/components/landing/LandingProductFeature';
import { LandingFeatureList } from '@/components/landing/feature/LandingFeatureList';
import { LandingSaleCtaSection } from '@/components/landing/cta/LandingSaleCta';

import { Button } from '@/components/shared/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <LandingPrimaryImageCtaSection
          title="Master WebGL with Interactive Tutorials"
          description="Render Quest is your gateway to mastering 3D graphics programming. Dive into our interactive WebGL tutorials and transform your coding skills."
          imageSrc="/images/webgl-hero-image.jpg"
          imageAlt="3D rendering example created with WebGL"
          imagePosition="right"
          withBackground
          variant="primary"
        >
          <Button size="xl" className="p-7 text-xl" variant="primary" asChild>
            <a href="#tutorial-gallery">Start Learning Now</a>
          </Button>
        </LandingPrimaryImageCtaSection>

        <LandingProductFeaturesGrid
          title="Why Choose Render Quest?"
          description="Our platform offers a unique blend of features to make your WebGL learning journey engaging and effective."
        >
          <LandingProductFeature
            title="Interactive Tutorials"
            description="Learn by doing with our hands-on, browser-based WebGL tutorials."
            imagePosition="center"
            imageSrc="/images/interactive-tutorials.jpg"
            imageAlt="Interactive WebGL tutorial interface"
          />
          <LandingProductFeature
            title="Real-time Feedback"
            description="Get instant feedback on your code and see your 3D creations come to life."
            imagePosition="center"
            imageSrc="/images/realtime-feedback.jpg"
            imageAlt="Real-time 3D rendering feedback"
          />
          <LandingProductFeature
            title="Project-Based Learning"
            description="Apply your skills to exciting 3D projects and build your portfolio."
            imagePosition="center"
            imageSrc="/images/project-based-learning.jpg"
            imageAlt="3D project showcase"
          />
          <LandingProductFeature
            title="Community Support"
            description="Join a vibrant community of WebGL enthusiasts and get help when you need it."
            imagePosition="center"
            imageSrc="/images/community-support.jpg"
            imageAlt="WebGL community discussion"
          />
        </LandingProductFeaturesGrid>
        
        <LandingFeatureList
          title="What You'll Learn"
          description="Our comprehensive curriculum covers everything you need to become a WebGL expert."
          withBackground
          variant="secondary"
          featureItems={[
            {
              title: "WebGL Fundamentals",
              description: "Master the basics of 3D graphics programming with WebGL.",
              icon: <BoxIcon className="w-8 h-8" />,
            },
            {
              title: "Shader Programming",
              description: "Learn to write vertex and fragment shaders for stunning visual effects.",
              icon: <CodeIcon className="w-8 h-8" />,
            },
            {
              title: "3D Math Concepts",
              description: "Understand the mathematics behind 3D transformations and projections.",
              icon: <BookOpenIcon className="w-8 h-8" />,
            },
            {
              title: "Advanced Techniques",
              description: "Explore advanced topics like shadow mapping, post-processing, and more.",
              icon: <RocketIcon className="w-8 h-8" />,
            },
            {
              title: "Game Development",
              description: "Apply your WebGL skills to create interactive 3D games and simulations.",
              icon: <GraduationCapIcon className="w-8 h-8" />,
            },
          ]}
        />

        <section id="tutorial-gallery" className="py-16 bg-gray-100 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">WebGL Tutorial Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <TutorialCard title="Getting Started with WebGL" difficulty="Beginner" />
              <TutorialCard title="Creating 3D Shapes" difficulty="Beginner" />
              <TutorialCard title="Introduction to Shaders" difficulty="Intermediate" />
              <TutorialCard title="Texture Mapping Techniques" difficulty="Intermediate" />
              <TutorialCard title="Lighting and Shadows" difficulty="Advanced" />
              <TutorialCard title="Particle Systems in WebGL" difficulty="Advanced" />
            </div>
          </div>
        </section>

        <LandingSaleCtaSection
          title="Ready to Start Your WebGL Journey?"
          description="Join thousands of developers who have transformed their skills with Render Quest."
          ctaLabel="Get Started for Free"
          ctaHref="#get-started"
          withBackground
          variant="primary"
        />
      </main>
      <Footer />
    </>
  );
}

function TutorialCard({ title, difficulty }: { title: string; difficulty: string }) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Difficulty: {difficulty}</p>
      <Button variant="secondary" size="sm" asChild>
        <a href="#">Start Tutorial</a>
      </Button>
    </div>
  );
}