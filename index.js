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
    this.settings.get('plugins', []).forEach((id) => this.watch.start(id));
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
      this.watch.start(id);
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

  get watch () {
    const { settings, notice } = this;
    const plugins = settings.get('plugins', []);

    return {
      start (id) {
        const plugin = powercord.pluginManager.plugins.get(id);
        const watcher = watch(plugin.entityPath, { recursive: true }, global._.debounce(() => {
          powercord.pluginManager.remount(id);
        }, 250));

        settings.set('plugins', [ ...plugins, id ]);
        notice(id, plugin.manifest.name, () => this.stop(id, watcher));
      },
      stop (id, watcher) {
        watcher.close();
        plugins.splice(plugins.indexOf(id), 1);
        settings.set('plugins', plugins);
      }
    };
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


