import { TutorialClient } from './TutorialClient';
import path from 'path';
import fs from 'fs/promises';

interface TutorialStep {
  title: string;
  content: string;
  code: string;
}

interface TutorialData {
  title: string;
  description: string;
  intro: string;
  steps: TutorialStep[];
}

async function getTutorialData(): Promise<TutorialData> {
  try {
    const tutorialPath = path.join(process.cwd(), 'data', 'tutorials', 'getting-started-with-webgl');
    const manifestPath = path.join(tutorialPath, 'manifest.json');
    
    const manifestContent = await fs.readFile(manifestPath, 'utf8');

    console.log('manifestContent:', manifestContent);

    const manifest = JSON.parse(manifestContent);

    if (!manifest.intro || typeof manifest.intro !== 'string') {
      throw new Error('Invalid or missing intro file in manifest');
    }

    const introContent = await fs.readFile(path.join(tutorialPath, manifest.intro), 'utf8');
    console.log('introContent:', introContent);

    if (!Array.isArray(manifest.steps)) {
      throw new Error('Invalid or missing steps in manifest');
    }

    const steps = await Promise.all(manifest.steps.map(async (step: any) => {
      if (!step.title || !step.content || !step.code) {
        throw new Error('Invalid step data in manifest');
      }
      return {
        title: step.title,
        content: await fs.readFile(path.join(tutorialPath, step.content), 'utf8'),
        code: await fs.readFile(path.join(tutorialPath, step.code), 'utf8'),
      };
    }));

    return {
      title: manifest.title || 'WebGL Tutorial',
      description: manifest.description || 'Learn WebGL step by step',
      intro: introContent,
      steps,
    };
  } catch (error) {
    console.error('Error loading tutorial data:', error);
    // Return some default data or rethrow the error
    throw error;
  }
}

export default async function TutorialPage() {
  try {
    const tutorialData = await getTutorialData();
    return <TutorialClient tutorialData={tutorialData} />;
  } catch (error) {
    // You might want to return an error component here
    return <div>Error loading tutorial. Please try again later.</div>;
  }
}