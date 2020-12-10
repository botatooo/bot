import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel, Role } from "discord.js";

export default class FilterExclude extends Command {
  constructor() {
    super("filterexcl", {
      description: (language: Language) =>
        language.get("FILTEREXCL_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "toexcl",
          type: "member|role|channel",
          default: undefined,
          required: false,
        },
      ],
      restrictTo: "guild",
      aliases: ["filterwhitelist", "filterexclude"],
    });
  }

  async exec(
    message: FireMessage,
    args: { toexcl?: FireMember | Role | TextChannel }
  ) {
    if (typeof args.toexcl == "undefined")
      return await this.sendCurrent(message);
    else if (!args.toexcl) return;
    let current: string[] = message.guild.settings.get("excluded.filter", []);
    if (current.includes(args.toexcl.id))
      current = current.filter((id) => id != args.toexcl.id);
    else current.push(args.toexcl.id);
    await message.guild.settings.set("excluded.filter", current);
    return await this.sendCurrent(message, true);
  }

  async sendCurrent(message: FireMessage, changed: boolean = false) {
    let mentions: { [key: string]: string } = {};
    let current: string[] = message.guild.settings.get("excluded.filter", []);
    for (const exclude of current) {
      if (message.guild.roles.cache.has(exclude))
        mentions[exclude] = message.guild.roles.cache.get(exclude).toString();
      if (
        message.guild.channels.cache
          .filter((channel) => channel.type == "text")
          .has(exclude)
      )
        mentions[exclude] = message.guild.channels.cache
          .get(exclude)
          .toString();
    }
    let mentionKeys = Object.keys(mentions);
    current = current.filter((id) => !mentionKeys.includes(id));
    const members = await message.guild.members.fetch({ user: current });
    for (const member of members.values())
      mentions[member.id] = (member as FireMember).toMention();
    mentionKeys = Object.keys(mentions);
    current = current.filter((id) => !mentionKeys.includes(id));
    if (current.length) {
      let excluded: string[] = message.guild.settings.get(
        "excluded.filter",
        []
      );
      excluded = excluded.filter((id) => !current.includes(id));
      await message.guild.settings.set("excluded.filter", excluded);
    }
    if (!changed)
      return await message.send(
        current.length ? "FILTEREXCL_LIST_SOME_REMOVED" : "FILTEREXCL_LIST",
        Object.values(mentions),
        current
      );
    else
      return await message.success(
        current.length ? "FILTEREXCL_SET_SOME_REMOVED" : "FILTEREXCL_SET",
        Object.values(mentions),
        current
      );
  }
}