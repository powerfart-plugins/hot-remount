const { Plugin } = require('powercord/entities');
const watch = require('node-watch'); // from powercord/package-lock.json

module.exports = class HotRemount extends Plugin {
  async startPlugin () {
    this.registerCommand();
    powercord.once('loaded', this.onLoaded.bind(this));
  }

  pluginWillUnload () {
    powercord.api.commands.unregisterCommand('watch');
  }

  onLoaded () {
    this.settings.get('plugins', []).forEach((id) => this.startWatch(id));
  }

  registerCommand () {
    powercord.api.commands.registerCommand({
      command: 'watch',
      label: 'Hot remount',
      usage: '{c} < plugin-id >',
      description: 'Track changes in a plugin and automatically remount it',
      executor: this.run.bind(this),
      autocomplete: this.autocomplete.bind(this)
    });
  }

  run ([ id ]) {
    if (powercord.pluginManager.plugins.has(id)) {
      if (this.settings.get('plugins', []).includes(id)) {
        return { result: 'Already watching' };
      }
      this.settings.set('plugins', [
        ...this.settings.get('plugins', []),
        id
      ]);
      this.startWatch(id);
      return false;
    }
    return { result: 'Plugin not found' };
  }

  autocomplete ([ findId, ...args ]) {
    if (args.length) {
      return;
    }
    return {
      commands: [ ...powercord.pluginManager.plugins ]
        .filter(([ id ]) => id.includes(findId))
        .map(([ id ]) => ({ command: id })),
      header: 'Plugins list'
    };
  }

  startWatch (id) {
    const plugin = powercord.pluginManager.plugins.get(id);
    const watcher = watch(plugin.entityPath, { recursive: true }, global._.debounce(() => {
      powercord.pluginManager.remount(id);
    }, 350));

    this.notice(id, plugin.manifest.name, () => {
      const plugins = this.settings.get('plugins', []);

      plugins.splice(plugins.indexOf(id), 1);
      this.settings.set('plugins', plugins);
      watcher.close();
    });
  }

  notice (id, name, onClick) {
    powercord.api.notices.sendAnnouncement(`hot-remount-stop-${id}`, {
      message: `Watching the plugin "${name}"`,
      button: {
        text: 'Stop',
        onClick
      }
    });
  }
};


