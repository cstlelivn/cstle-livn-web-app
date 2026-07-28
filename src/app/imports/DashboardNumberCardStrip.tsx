import svgPaths from "./svg-kds79s2oqf";

function Frame9() {
  return (
    <div className="basis-0 content-stretch flex font-['Roboto_Mono:Bold',_sans-serif] font-bold gap-[41px] grow items-center leading-[1.2] min-h-px min-w-px relative shrink-0 text-[12px] text-nowrap uppercase whitespace-pre">
      <p className="relative shrink-0 text-[#999999]">all kpis</p>
      <p className="relative shrink-0 text-[#cecece]">Project</p>
      <p className="relative shrink-0 text-[#cecece]">Finance</p>
      <p className="relative shrink-0 text-[#cecece]">Human resources</p>
    </div>
  );
}

function Plus() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="plus">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="plus">
          <path d="M12 5V19M5 12H19" id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
      <Plus />
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] relative shrink-0 text-[#999999] text-[10px] text-nowrap text-right whitespace-pre">Add Indicator</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-end relative shrink-0 w-full">
      <Frame9 />
      <Frame8 />
    </div>
  );
}

function Folder() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="folder">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="folder">
          <path d={svgPaths.p281b8900} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Active Projects</p>
      <Folder />
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999]">{`3 total projects `}</p>
      <p className="relative shrink-0 text-[#008a2e] text-nowrap text-right whitespace-pre">+5%</p>
    </div>
  );
}

function NumberDetail() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="number detail">
      <p className="[white-space-collapse:collapse] font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[32px] overflow-ellipsis overflow-hidden relative shrink-0 text-[24px] text-neutral-700 text-nowrap tracking-[-0.96px] w-full" style={{ fontVariationSettings: "'wdth' 137" }}>
        4
      </p>
      <Frame6 />
    </div>
  );
}

function NumberCard() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame />
          <NumberDetail />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function RollerBrush() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="roller-brush">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="roller-brush">
          <path d={svgPaths.p1e07ff00} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Overdue Tasks</p>
      <RollerBrush />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999]">{`23 total tasks `}</p>
      <p className="relative shrink-0 text-[#008a2e] text-nowrap text-right whitespace-pre">-2%</p>
    </div>
  );
}

function NumberDetail1() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="number detail">
      <p className="[white-space-collapse:collapse] font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[32px] overflow-ellipsis overflow-hidden relative shrink-0 text-[24px] text-neutral-700 text-nowrap tracking-[-0.96px] w-full" style={{ fontVariationSettings: "'wdth' 137" }}>
        8
      </p>
      <Frame10 />
    </div>
  );
}

function NumberCard1() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame1 />
          <NumberDetail1 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function LineChartUp02() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="line-chart-up-02">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="line-chart-up-02">
          <path d={svgPaths.p38ae7280} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Monthly Revenue</p>
      <LineChartUp02 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999]">2 Payments</p>
      <p className="relative shrink-0 text-[#008a2e] text-nowrap text-right whitespace-pre">+10%</p>
    </div>
  );
}

function NumberDetail2() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="number detail">
      <p className="[white-space-collapse:collapse] font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[32px] overflow-ellipsis overflow-hidden relative shrink-0 text-[24px] text-neutral-700 text-nowrap tracking-[-0.96px] w-full" style={{ fontVariationSettings: "'wdth' 137" }}>
        $1.2M
      </p>
      <Frame11 />
    </div>
  );
}

function NumberCard2() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame2 />
          <NumberDetail2 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function CoinsHand() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="coins-hand">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="coins-hand">
          <path d={svgPaths.p3c298b00} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Payments Due</p>
      <CoinsHand />
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999]">3 Pending Payments</p>
      <p className="relative shrink-0 text-[#ff0004] text-nowrap text-right whitespace-pre">+6%</p>
    </div>
  );
}

function NumberDetail3() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="number detail">
      <p className="[white-space-collapse:collapse] font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[32px] overflow-ellipsis overflow-hidden relative shrink-0 text-[24px] text-neutral-700 text-nowrap tracking-[-0.96px] w-full" style={{ fontVariationSettings: "'wdth' 137" }}>
        $300K
      </p>
      <Frame12 />
    </div>
  );
}

function NumberCard3() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame3 />
          <NumberDetail3 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function Activity() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="activity">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="activity">
          <path d="M22 12H18L15 21L9 3L6 12H2" id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Team Performance</p>
      <Activity />
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999]">Average Aura Rating</p>
      <p className="relative shrink-0 text-[#ff0004] text-nowrap text-right whitespace-pre">+6%</p>
    </div>
  );
}

function NumberDetail4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-name="number detail">
      <p className="[white-space-collapse:collapse] font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[32px] overflow-ellipsis overflow-hidden relative shrink-0 text-[24px] text-neutral-700 text-nowrap tracking-[-0.96px] w-full" style={{ fontVariationSettings: "'wdth' 137" }}>
        4.7
      </p>
      <Frame13 />
    </div>
  );
}

function NumberCard4() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame4 />
          <NumberDetail4 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function CardContainer() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Card Container">
      <NumberCard />
      <NumberCard1 />
      <NumberCard2 />
      <NumberCard3 />
      <NumberCard4 />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame7 />
      <CardContainer />
    </div>
  );
}

export default function DashboardNumberCardStrip() {
  return (
    <div className="bg-white relative size-full" data-name="Dashboard Number Card Strip">
      <div className="flex flex-col justify-center size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] items-start justify-center px-[34px] py-[8px] relative size-full">
          <Container />
        </div>
      </div>
    </div>
  );
}