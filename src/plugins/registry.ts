import type { MemoryStore } from "../memory/types";
import type { MemoryHooks } from "./hooks";

export type TUICommand = {
  name: string;
  description: string;
  aliases?: string[];
  handler: (store: MemoryStore, args: string[]) => void;
};

export type Plugin = {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  tuiCommands?: TUICommand[];
  memoryHooks?: Partial<MemoryHooks>;
};

export class PluginRegistry {
  private commands: TUICommand[] = [];
  private hooks: MemoryHooks = {};

  register(plugin: Plugin) {
    if (plugin.tuiCommands) {
      this.commands.push(...plugin.tuiCommands);
    }
    if (plugin.memoryHooks) {
      const h = plugin.memoryHooks;
      this.hooks = {
        beforeSave: h.beforeSave ?? this.hooks.beforeSave,
        afterSave: h.afterSave ?? this.hooks.afterSave,
        beforeLoad: h.beforeLoad ?? this.hooks.beforeLoad,
        afterParse: h.afterParse ?? this.hooks.afterParse,
        beforeUpdate: h.beforeUpdate ?? this.hooks.beforeUpdate,
        afterUpdate: h.afterUpdate ?? this.hooks.afterUpdate,
        beforeDelete: h.beforeDelete ?? this.hooks.beforeDelete,
        afterDelete: h.afterDelete ?? this.hooks.afterDelete,
      };
    }
  }

  getCommands(): TUICommand[] {
    return this.commands;
  }

  getHooks(): MemoryHooks {
    return this.hooks;
  }

  list(): Plugin[] {
    return this.commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
    })) as Plugin[];
  }

  toggle(_id: string): boolean {
    return false;
  }
}

export function createPluginRegistry(): PluginRegistry {
  return new PluginRegistry();
}
