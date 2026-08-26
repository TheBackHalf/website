type DoorSide = "left" | "right";

export function EntranceDoorFace({ side }: { side: DoorSide }) {
  return (
    <div className={`bh-ent-door-sculpt is-${side}`} aria-hidden="true">
      <div className="bh-ent-door-photo" />
      <div className="bh-ent-door-carve" />
      <div className="bh-ent-door-sheen" />
      <div className="bh-ent-door-astragal" />
    </div>
  );
}
