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
import { LandingMarquee } from '@/components/landing/LandingMarquee';

import { Button } from '@/components/shared/ui/button';

export default function Home() {
  return (
    <main>
      <LandingPrimaryImageCtaSection
        title="Master WebGL with Interactive Tutorials"
        description="RenderQuest is your gateway to mastering 3D graphics programming. Dive into our interactive WebGL tutorials and transform your coding skills."
        imageSrc="/images/webgl-hero.jpg"
        imageAlt="WebGL 3D rendering example"
        imagePosition="right"
        withBackground
        variant="primary"
      >
        <Button size="xl" className="p-7 text-xl" variant="primary" asChild>
          <a href="#get-started">Start Learning Now</a>
        </Button>
      </LandingPrimaryImageCtaSection>

      <LandingProductFeaturesGrid
        title="Why Choose RenderQuest?"
        description="Our platform offers a unique blend of features to make your WebGL learning journey engaging and effective."
      >
        <LandingProductFeature
          title="Interactive Tutorials"
          description="Learn by doing with our hands-on, browser-based WebGL tutorials."
          imageSrc="/images/interactive-tutorial.jpg"
          imagePosition="center"
        />
        <LandingProductFeature
          title="Real-time Feedback"
          description="Get instant feedback on your code and see your 3D creations come to life."
          imageSrc="/images/realtime-feedback.jpg"
          imagePosition="center"
        />
        <LandingProductFeature
          title="Project-Based Learning"
          description="Apply your skills to exciting 3D projects and build your portfolio."
          imageSrc="/images/project-based.jpg"
          imagePosition="center"
        />
        <LandingProductFeature
          title="Community Support"
          description="Join a vibrant community of WebGL enthusiasts and get help when you need it."
          imageSrc="/images/community-support.jpg"
          imagePosition="center"
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

      <LandingSaleCtaSection
        title="Ready to Start Your WebGL Journey?"
        description="Join thousands of developers who have transformed their skills with RenderQuest."
        ctaLabel="Get Started for Free"
        ctaHref="#get-started"
        withBackground
        variant="primary"
      />

      <LandingMarquee
        withBackground
        variant="secondary"
        animationDirection="left"
      >
        <img src="/logos/company1.png" alt="Company 1" className="h-12 mx-8" />
        <img src="/logos/company2.png" alt="Company 2" className="h-12 mx-8" />
        <img src="/logos/company3.png" alt="Company 3" className="h-12 mx-8" />
        <img src="/logos/company4.png" alt="Company 4" className="h-12 mx-8" />
        <img src="/logos/company5.png" alt="Company 5" className="h-12 mx-8" />
      </LandingMarquee>
    </main>
  );
}