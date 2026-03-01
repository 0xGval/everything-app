import type { WidgetDefinition } from './types';

const registry = new Map<string, WidgetDefinition>();

export function registerWidget(definition: WidgetDefinition): void {
  registry.set(definition.manifest.id, definition);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return registry.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}
