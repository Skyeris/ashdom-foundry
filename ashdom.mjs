<div class="ashdom-sheet">
  <div class="ashdom-panel">
    <div class="ashdom-form-row">
      <label for="ashdom-npc-name-{{actor.id}}">NAME</label>
      <input
        id="ashdom-npc-name-{{actor.id}}"
        type="text"
        name="name"
        value="{{actor.name}}"
      >
    </div>

    <label for="ashdom-npc-description-{{actor.id}}">DESCRIPTION</label>
    <textarea
      id="ashdom-npc-description-{{actor.id}}"
      name="system.details.description"
    >{{system.details.description}}</textarea>
  </div>
</div>
