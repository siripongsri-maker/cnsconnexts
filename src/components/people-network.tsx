import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, MoveUpRight, Plus, Minus } from "lucide-react";
import {
  buildPeopleNetwork,
  type NetworkPerson,
  type NetworkConnection,
} from "@/lib/people-network";
import { PROVINCES } from "@/lib/thailand-geo";
import { issueTh, provinceTh, STATUS_TH } from "@/lib/i18n";

type Selection = { kind: "edge" | "person"; id: string } | null;
type Props = {
  users: NetworkPerson[];
  connections: NetworkConnection[];
  me: NetworkPerson | null;
  hydrated: boolean;
  available: boolean;
  totals: { people: number; ideas: number; connections: number };
};

/** Displays the explicitly approved, minimal public network projection. */
export function PeopleNetwork({ users, connections, me, hydrated, available, totals }: Props) {
  const uid = useId().replace(/:/g, "");
  const graph = useMemo(() => buildPeopleNetwork(users, connections, me), [users, connections, me]);
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState({ level: 1, x: 500, y: 800 });
  const inspectorRef = useRef<HTMLElement>(null);
  const selectedPerson =
    selection?.kind === "person"
      ? graph.people.find((u) => u.id === selection.id)
      : selection === null && !graph.edges.length
        ? graph.people[0]
        : null;
  const personEdges = selectedPerson
    ? graph.edges.filter(
        (edge) => edge.source.id === selectedPerson.id || edge.target.id === selectedPerson.id,
      )
    : [];
  const edge =
    selection?.kind === "edge"
      ? graph.edges.find((item) => item.id === selection.id)
      : selectedPerson
        ? personEdges[0]
        : selection === null
          ? graph.edges[0]
          : undefined;
  const activePeople = new Set(
    edge ? [edge.source.id, edge.target.id] : selectedPerson ? [selectedPerson.id] : [],
  );
  const occupied = new Set(graph.nodes.map((node) => node.province.en));
  const activeProvinces = new Set(
    [
      edge?.sourceNode?.province.en,
      edge?.targetNode?.province.en,
      graph.nodes.find((node) => node.id === selectedPerson?.id)?.province.en,
    ].filter(Boolean),
  );
  const edgeIndex = edge ? graph.edges.findIndex((item) => item.id === edge.id) : -1;
  const personIndex = selectedPerson
    ? graph.people.findIndex((item) => item.id === selectedPerson.id)
    : -1;
  const choosingPerson = selection?.kind === "person";
  const options = choosingPerson || !graph.edges.length ? graph.people : graph.edges;
  const currentIndex = choosingPerson || !graph.edges.length ? personIndex : edgeIndex;
  const hasSelection = selection !== null && activePeople.size > 0;
  const status = edge?.connections[0]?.status;
  const activate = (kind: "edge" | "person", id: string) => setSelection({ kind, id });
  const activateClick = (kind: "edge" | "person", id: string) => {
    activate(kind, id);
    if (window.matchMedia("(max-width: 700px)").matches) {
      inspectorRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  };
  const changeZoom = (delta: number) => {
    const level = Math.max(1, Math.min(8, zoom.level * (delta > 0 ? 2 : 0.5)));
    const personNode = graph.nodes.find((node) => node.id === selectedPerson?.id);
    const x =
      personNode?.x ??
      (edge?.sourceNode && edge.targetNode ? (edge.sourceNode.x + edge.targetNode.x) / 2 : zoom.x);
    const y =
      personNode?.y ??
      (edge?.sourceNode && edge.targetNode ? (edge.sourceNode.y + edge.targetNode.y) / 2 : zoom.y);
    setZoom({ level, x, y });
  };
  const viewWidth = 1000 / zoom.level;
  const viewHeight = 1600 / zoom.level;
  const viewBox = `${Math.max(0, Math.min(1000 - viewWidth, zoom.x - viewWidth / 2))} ${Math.max(0, Math.min(1600 - viewHeight, zoom.y - viewHeight / 2))} ${viewWidth} ${viewHeight}`;
  const keyActivate = (event: KeyboardEvent<SVGGElement>, kind: "edge" | "person", id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(kind, id);
    }
  };
  const step = (delta: number) => {
    const index = (currentIndex + delta + options.length) % options.length;
    const next = options[index];
    if (next) activate(choosingPerson || !graph.edges.length ? "person" : "edge", next.id);
  };
  const regions = new Set(
    graph.people
      .map((person) => person.region)
      .filter((region) => region && region !== "Nationwide"),
  ).size;
  const metrics = [
    { label: "โปรไฟล์รวม", value: totals.people },
    { label: "ไอเดีย", value: totals.ideas },
    { label: "การเชื่อมต่อรวม", value: totals.connections },
    { label: "ภูมิภาค", value: hydrated ? regions : null },
  ];
  const locationMissing = graph.stats.people - graph.stats.locatedPeople;
  return (
    <section
      id="collective-power"
      className="collective-power people-network"
      aria-labelledby="collective-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setSelection({ kind: "person", id: "" });
        }
      }}
    >
      <div className="mission-container people-network-inner">
        <div className="people-network-top">
          <div className="people-network-intro" data-lenis-prevent>
            <p lang="en" className="mission-eyebrow">
              Our collective power
            </p>
            <h2 id="collective-title" className="people-network-title">
              ต่างพลัง
              <br />
              <span>
                เชื่อมเป็นหนึ่ง<span className="mission-period">.</span>
              </span>
            </h2>
            <p className="people-network-description">
              เชื่อมคน เชื่อมพลัง
              <br />
              เชื่อมกันได้ทั่วประเทศไทย
            </p>
            <p className="people-network-scope">ชี้จุดหรือเส้น เพื่อรู้จักพลังที่เชื่อมกัน</p>
            <div className="people-network-actions">
              <Link to="/onboarding" className="people-network-start">
                เริ่มเชื่อมพลัง <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <Link to="/map" className="people-network-explore">
                สำรวจแผนที่ <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="people-network-stage">
            <div className="people-network-map-label" aria-hidden="true">
              <span>THAILAND</span>
              <span>PEOPLE / CONNECTIONS</span>
            </div>
            <svg
              className="people-network-map"
              viewBox={viewBox}
              role="group"
              aria-label="แผนที่ผู้คนและการเชื่อมต่อในประเทศไทย"
              aria-describedby={`${uid}-map-note`}
            >
              <defs>
                <radialGradient id={`${uid}-glow`}>
                  <stop stopColor="#1689c0" stopOpacity=".28" />
                  <stop offset="1" stopColor="#1689c0" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse
                cx="460"
                cy="730"
                rx="520"
                ry="850"
                fill={`url(#${uid}-glow)`}
                aria-hidden="true"
              />
              <g className="people-network-provinces" aria-hidden="true">
                {PROVINCES.map((province) => (
                  <path
                    key={province.en}
                    d={province.d}
                    data-occupied={occupied.has(province.en)}
                    data-active={activeProvinces.has(province.en)}
                  />
                ))}
              </g>
              <g className="people-network-links">
                {graph.plottedEdges.map((item) => (
                  <g
                    key={item.id}
                    className="people-network-link"
                    data-active={edge?.id === item.id}
                    data-muted={hasSelection && edge?.id !== item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.source.name} เชื่อมกับ ${item.target.name}`}
                    aria-pressed={edge?.id === item.id}
                    aria-controls={`${uid}-details`}
                    onPointerEnter={() => activate("edge", item.id)}
                    onFocus={() => activate("edge", item.id)}
                    onClick={() => activateClick("edge", item.id)}
                    onKeyDown={(event) => keyActivate(event, "edge", item.id)}
                  >
                    <path className="people-network-line" d={item.path!} fill="none" />
                    <path className="people-network-hit" d={item.path!} fill="none" />
                  </g>
                ))}
              </g>
              <g className="people-network-nodes">
                {graph.nodes.map((node) => (
                  <g
                    key={node.id}
                    transform={`translate(${node.x} ${node.y})`}
                    className="people-network-node"
                    data-active={activePeople.has(node.id)}
                    data-muted={hasSelection && !activePeople.has(node.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.user.name} · ${node.province.th} · ${node.degree} คู่เชื่อม`}
                    aria-pressed={activePeople.has(node.id)}
                    aria-controls={`${uid}-details`}
                    onPointerEnter={() => activate("person", node.id)}
                    onFocus={() => activate("person", node.id)}
                    onClick={() => activateClick("person", node.id)}
                    onKeyDown={(event) => keyActivate(event, "person", node.id)}
                  >
                    <circle className="people-network-node-target" r="14" />
                    <circle className="people-network-node-ring" r="22" />
                    <circle className="people-network-dot" r={node.degree ? 9 : 6} />
                  </g>
                ))}
              </g>
            </svg>
            <div className="people-network-zoom" aria-label="ปรับขนาดแผนที่">
              <button
                type="button"
                onClick={() => changeZoom(1)}
                disabled={zoom.level >= 8}
                aria-label="ขยายแผนที่บริเวณที่เลือก"
              >
                <Plus size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => changeZoom(-1)}
                disabled={zoom.level <= 1}
                aria-label="ย่อแผนที่"
              >
                <Minus size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setZoom({ level: 1, x: 500, y: 800 })}>
                ทั้งประเทศ
              </button>
            </div>
            <div className="people-network-legend" aria-hidden="true">
              <span>
                <i /> ผู้คน
              </span>
              <span>
                <i /> บันทึกการเชื่อมต่อ
              </span>
            </div>
            <p id={`${uid}-map-note`} className="people-network-map-note">
              ตำแหน่งแสดงระดับจังหวัด · {graph.plottedEdges.length.toLocaleString("th-TH")}{" "}
              คู่เชื่อมสาธารณะ
            </p>
          </div>

          <aside
            ref={inspectorRef}
            className="people-network-inspector"
            aria-label="รายละเอียดผู้คนและการเชื่อมต่อ"
            tabIndex={0}
          >
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {edge
                ? `${edge.source.name} เชื่อมกับ ${edge.target.name} ความสนใจที่ตรงกัน: ${edge.sharedInterests.length ? edge.sharedInterests.map(issueTh).join(" · ") : "ยังไม่มีประเด็นที่ระบุร่วมกัน"}`
                : selectedPerson
                  ? `${selectedPerson.name} ${provinceTh(selectedPerson.province)} ยังไม่มีคู่เชื่อม`
                  : "เลือกจุดหรือเส้นเพื่อดูรายละเอียด"}
            </p>
            <div className="people-network-detail-head">
              <span lang="en">CONNECTED PEOPLE</span>
              <MoveUpRight size={18} aria-hidden="true" />
            </div>
            <div
              className="people-network-detail"
              id={`${uid}-details`}
              data-lenis-prevent
              tabIndex={0}
              aria-label="รายละเอียดที่เลือก"
            >
              {!hydrated ? (
                <div className="people-network-empty" role="status">
                  <h3>กำลังโหลดเครือข่าย…</h3>
                  <p>กำลังเชื่อมข้อมูลผู้คนและพื้นที่</p>
                </div>
              ) : !available ? (
                <div className="people-network-empty" role="status">
                  <h3>โหลดเครือข่ายยังไม่สำเร็จ</h3>
                  <p>ลองโหลดหน้านี้อีกครั้งเมื่อการเชื่อมต่อพร้อม</p>
                </div>
              ) : edge ? (
                <>
                  <div className="people-network-pair">
                    <Person person={edge.source} />
                    <span className="people-network-pair-connector" aria-hidden="true">
                      ↕
                    </span>
                    <Person person={edge.target} />
                  </div>
                  <div className="people-network-topics">
                    <h3>ความสนใจที่ตรงกัน</h3>
                    {edge.sharedInterests.length ? (
                      <ul>
                        {edge.sharedInterests.map((interest) => (
                          <li key={interest}>{issueTh(interest)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>ยังไม่มีประเด็นที่ระบุร่วมกัน</p>
                    )}
                  </div>
                  {status && (
                    <p className="people-network-status">
                      {STATUS_TH[status]} <span>· บันทึกในระบบ</span>
                    </p>
                  )}
                  {!edge.path && (
                    <p className="people-network-unlocated">
                      คู่นี้ยังระบุจังหวัดไม่ครบ จึงยังไม่วาดเส้นบนแผนที่
                    </p>
                  )}
                  {selectedPerson && personEdges.length > 1 && (
                    <p className="people-network-unlocated">
                      {selectedPerson.name} มี {personEdges.length} คู่เชื่อม เลือกดูทุกคู่ด้านล่าง
                    </p>
                  )}
                </>
              ) : selectedPerson ? (
                <>
                  <Person person={selectedPerson} />
                  <div className="people-network-empty">
                    <h3>ยังไม่มีคู่เชื่อม</h3>
                    <p>เส้นจะแสดงเมื่อมีบันทึกการเชื่อมต่อในระบบ</p>
                  </div>
                </>
              ) : (
                <div className="people-network-empty">
                  <h3>พลังที่เชื่อมกัน เริ่มจากคน</h3>
                  <p>
                    ชี้หรือแตะจุดบนแผนที่
                    <br />
                    แล้วรู้จักคนในเครือข่าย
                  </p>
                  {!graph.edges.length && <p>ยังไม่มีคู่เชื่อม</p>}
                </div>
              )}
            </div>
            <div className="people-network-controls">
              <label htmlFor={`${uid}-select`}>เลือกคนหรือคู่เชื่อมต่อ</label>
              <select
                id={`${uid}-select`}
                value={
                  selectedPerson ? `person:${selectedPerson.id}` : edge ? `edge:${edge.id}` : ""
                }
                disabled={!hydrated || !available || !graph.people.length}
                onChange={(event) =>
                  activate(
                    event.target.value.startsWith("edge:") ? "edge" : "person",
                    event.target.value.slice(event.target.value.indexOf(":") + 1),
                  )
                }
              >
                <option value="">
                  {graph.edges.length ? "เลือกคู่ที่อยากรู้จัก" : "เลือกคนที่อยากรู้จัก"}
                </option>
                {!!graph.edges.length && (
                  <optgroup label="คู่เชื่อมต่อสาธารณะ">
                    {graph.edges.map((item) => (
                      <option key={item.id} value={`edge:${item.id}`}>
                        {item.source.name} ↔ {item.target.name}
                        {item.path ? "" : " · ไม่ระบุจังหวัดครบ"}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="ผู้คนในเครือข่าย">
                  {graph.people.map((person) => (
                    <option key={person.id} value={`person:${person.id}`}>
                      {person.name} ·{" "}
                      {person.province ? provinceTh(person.province) : "ไม่ระบุจังหวัด"}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div>
                <span>
                  {currentIndex >= 0 ? currentIndex + 1 : "—"} /{" "}
                  {options.length.toLocaleString("th-TH")}
                </span>
                <button
                  type="button"
                  aria-label="ดูรายการก่อนหน้า"
                  onClick={() => step(-1)}
                  disabled={!options.length || !available}
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="ดูรายการถัดไป"
                  onClick={() => step(1)}
                  disabled={!options.length || !available}
                >
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </aside>
        </div>
        <div className="people-network-bottom">
          <dl className="people-network-metrics">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value === null ? "—" : metric.value.toLocaleString("th-TH")}</dd>
              </div>
            ))}
          </dl>
          <p className="people-network-unlocated">
            {graph.unlocatedEdges.length > 0 &&
              `${graph.unlocatedEdges.length} คู่ยังระบุจังหวัดไม่ครบ · `}
            {locationMissing > 0 && `${locationMissing} คนยังไม่มีตำแหน่งจังหวัด · `}
            เส้นเชื่อมจากบันทึกจริง · อัปเดตอัตโนมัติ
          </p>
        </div>
      </div>
    </section>
  );
}

function Person({ person }: { person: NetworkPerson }) {
  return (
    <div className="people-network-person">
      <span className="people-network-avatar" aria-hidden="true">
        {person.name.trim().slice(0, 1) || "●"}
      </span>
      <div>
        <h3>{person.name}</h3>
        <p>{person.province ? provinceTh(person.province) : "ไม่ระบุจังหวัด"}</p>
      </div>
    </div>
  );
}
