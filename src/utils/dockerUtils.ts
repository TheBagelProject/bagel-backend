import { execSync } from 'child_process';

export function getContainerIdsByImage(imageName: string): string[] {
  try {
    const output = execSync(`docker ps --format "{{.ID}} {{.Image}}"`).toString();
    return output
      .split("\n")
      .filter(line => line.includes(imageName))
      .map(line => line.split(" ")[0])
      .filter(Boolean);
  } catch (err) {
    console.error(`Failed to get containers for image "${imageName}":`, (err as Error).message);
    return [];
  }
}