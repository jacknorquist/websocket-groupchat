"use strict";

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** send message just to user about list of members in chat */

  showMembers() {
    this.room.broadcast({
      name: this.name,
      type: "note",
      text: this.room.members
    });
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }


  async handleJoke() {
    this.room.broadcast({
      name: "Server",
      type: "chat",
      text: await ChatUser.getJoke()
    });
  }

  /** get random jokes from API */

  static async getJoke() {
    const url = "https://icanhazdadjoke.com/"
    const response = await fetch(
      url, {
        headers: {
          "accept": "application/json"
        }
      })

    const joke = await response.json();
    return joke.joke;
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * - {type: "get-joke", text: joke} : get-joke
   * </code>
   */

  async handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.text === "/joke") msg.type = "get-joke";
    if (msg.text === "/members") msg.type = "get-members";

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "get-joke") await this.handleJoke();
    else if (msg.type === "get-members") this.showMembers();
    else if (msg.type === "chat") this.handleChat(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
