import svgPaths from "./svg-fzjtm7plrr";

function SmallLogo1() {
  return (
    <div className="h-[35px] relative shrink-0 w-[89px]" data-name="small logo 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 89 35">
        <g id="small logo 1">
          <path d={svgPaths.p2f280900} fill="var(--fill-0, #F1F1F1)" id="Vector" />
          <path d={svgPaths.pf83e772} fill="var(--fill-0, #F1F1F1)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Logo() {
  return (
    <div className="h-[32px] relative shrink-0 w-full" data-name="logo">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[4px] h-[32px] items-center justify-center relative w-full">
        <SmallLogo1 />
      </div>
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="h-[140.5px] relative shrink-0 w-[200px]" data-name="SidebarHeader">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-neutral-700 border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col h-[140.5px] items-start justify-between pb-[25px] pt-[24px] px-[16px] relative w-[200px]">
        <Logo />
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.pff0fc00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1d76d410} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2f091200} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p39897300} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App() {
  return (
    <div className="relative shrink-0" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center overflow-clip relative rounded-[inherit]">
        <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[20px] relative shrink-0 text-[14px] text-nowrap text-white whitespace-pre">Dashboard</p>
      </div>
    </div>
  );
}

function SidebarMenuButton() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon />
      <App />
    </div>
  );
}

function SidebarMenuItem() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton />
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p5bb1570} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M5.33333 6.66667V9.33333" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 6.66667V8" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 6.66667V10.6667" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[67.211px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[67.211px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Projects</p>
      </div>
    </div>
  );
}

function SidebarMenuButton1() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon1 />
      <App1 />
    </div>
  );
}

function SidebarMenuItem1() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton1 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2712)" id="Icon">
          <path d={svgPaths.pda21400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1be36900} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.pa8d100} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 4H9.33333" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 6.66667H9.33333" id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 9.33333H9.33333" id="Vector_6" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 12H9.33333" id="Vector_7" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2712">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function App2() {
  return (
    <div className="h-[20px] relative shrink-0 w-[58.813px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[58.813px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Vendors</p>
      </div>
    </div>
  );
}

function SidebarMenuButton2() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon2 />
      <App2 />
    </div>
  );
}

function SidebarMenuItem2() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton2 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p32887f80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3b6ee540} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p188b8380} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3694d280} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App3() {
  return (
    <div className="h-[20px] relative shrink-0 w-[33.609px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[33.609px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Team</p>
      </div>
    </div>
  );
}

function SidebarMenuButton3() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon3 />
      <App3 />
    </div>
  );
}

function SidebarMenuItem3() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton3 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2619)" id="Icon">
          <path d={svgPaths.p39ee6532} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p17781bc0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p224042c0} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2619">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function App4() {
  return (
    <div className="h-[20px] relative shrink-0 w-[25.211px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[25.211px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">CRM</p>
      </div>
    </div>
  );
}

function SidebarMenuButton4() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon4 />
      <App4 />
    </div>
  );
}

function SidebarMenuItem4() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton4 />
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p2bb95e00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 14.6667V8" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p14df0fc0} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M5 2.84666L11 6.27999" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App5() {
  return (
    <div className="h-[20px] relative shrink-0 w-[75.617px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[75.617px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Inventory</p>
      </div>
    </div>
  );
}

function SidebarMenuButton5() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon5 />
      <App5 />
    </div>
  );
}

function SidebarMenuItem5() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton5 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M8 1.33333V14.6667" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p5120400} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[58.813px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[58.813px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Finance</p>
      </div>
    </div>
  );
}

function SidebarMenuButton6() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon6 />
      <App6 />
    </div>
  );
}

function SidebarMenuItem6() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton6 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p90824c0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M12 11.3333V6" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8.66667 11.3333V3.33333" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M5.33333 11.3333V9.33333" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App7() {
  return (
    <div className="h-[20px] relative shrink-0 w-[75.617px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[75.617px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Analytics</p>
      </div>
    </div>
  );
}

function SidebarMenuButton7() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon7 />
      <App7 />
    </div>
  );
}

function SidebarMenuItem7() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton7 />
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p19d57600} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2fe1fe40} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p25c2200} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App8() {
  return (
    <div className="h-[20px] relative shrink-0 w-[117.625px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[117.625px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Design Library</p>
      </div>
    </div>
  );
}

function SidebarMenuButton8() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon8 />
      <App8 />
    </div>
  );
}

function SidebarMenuItem8() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton8 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App9() {
  return (
    <div className="h-[20px] relative shrink-0 w-[75.617px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[75.617px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Proposals</p>
      </div>
    </div>
  );
}

function SidebarMenuButton9() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon9 />
      <App9 />
    </div>
  );
}

function SidebarMenuItem9() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton9 />
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p10972f00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p28db2b80} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function App10() {
  return (
    <div className="h-[20px] relative shrink-0 w-[67.211px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[20px] overflow-clip relative rounded-[inherit] w-[67.211px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[14px] text-nowrap text-white top-[-0.5px] whitespace-pre">Settings</p>
      </div>
    </div>
  );
}

function SidebarMenuButton10() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[32px] items-center overflow-clip pl-[8px] pr-0 py-0 relative rounded-[6px] shrink-0 w-[255px]" data-name="SidebarMenuButton">
      <Icon10 />
      <App10 />
    </div>
  );
}

function SidebarMenuItem10() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative shrink-0 w-[200px]" data-name="SidebarMenuItem">
      <SidebarMenuButton10 />
    </div>
  );
}

function SidebarMenu() {
  return (
    <div className="relative shrink-0" data-name="SidebarMenu">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative">
        <SidebarMenuItem />
        <SidebarMenuItem1 />
        <SidebarMenuItem2 />
        <SidebarMenuItem3 />
        <SidebarMenuItem4 />
        <SidebarMenuItem5 />
        <SidebarMenuItem6 />
        <SidebarMenuItem7 />
        <SidebarMenuItem8 />
        <SidebarMenuItem9 />
        <SidebarMenuItem10 />
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0" data-name="SidebarContent">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col h-full items-start overflow-clip relative rounded-[inherit]">
        <SidebarMenu />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-black h-[782px] relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col h-[782px] items-start relative">
        <SidebarHeader />
        <SidebarContent />
      </div>
    </div>
  );
}

function SidebarOpen() {
  return (
    <div className="box-border content-stretch flex h-[782px] items-start pl-0 pr-px py-0 relative shrink-0" data-name="Sidebar open">
      <div aria-hidden="true" className="absolute border-[#858585] border-[0px_1px_0px_0px] border-solid inset-0 pointer-events-none" />
      <Container />
    </div>
  );
}

function Icon11() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p19d57600} id="Vector" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6 2V14" id="Vector_2" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[28px]" data-name="Button">
      <Icon11 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="absolute bg-red-600 box-border content-stretch flex flex-col gap-[6px] items-center justify-center left-[calc(50%+8.739px)] p-[6px] rounded-[60px] size-[12px] top-[-4px] translate-x-[-50%]">
      <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-[-2px] pointer-events-none rounded-[62px]" />
      <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[13.5px] relative shrink-0 text-[9px] text-center text-white w-full">3</p>
    </div>
  );
}

function Bell01() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="bell-01">
      <div className="absolute inset-[8.33%_13.59%]" data-name="Icon">
        <div className="absolute inset-[-5%_-5.72%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 22">
            <path d={svgPaths.p2a34f9f2} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <Frame15 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-end relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[22.5px] relative shrink-0 text-[#111111] text-[15px] text-nowrap text-right whitespace-pre">Demilade Adeniyi</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-end opacity-60 relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[18px] relative shrink-0 text-[#111111] text-[12px] text-nowrap text-right whitespace-pre">Super Admin</p>
    </div>
  );
}

function Container1() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative">
        <Paragraph />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Icon12() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.pace200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2d59bff0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p163b1640} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-[#cecece] relative rounded-[1.67772e+07px] shrink-0 size-[40px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[40px]">
        <Icon12 />
      </div>
    </div>
  );
}

function Profile() {
  return (
    <div className="content-stretch flex gap-[12px] h-[40.5px] items-center justify-end relative shrink-0" data-name="Profile">
      <Container1 />
      <Container2 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[40px] items-center justify-end relative shrink-0">
      <Bell01 />
      <Profile />
    </div>
  );
}

function Header() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="header">
      <div aria-hidden="true" className="absolute border-[#999999] border-[0px_0px_1px] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex items-center justify-between px-[24px] py-[11px] relative w-full">
          <Button />
          <Frame14 />
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[10px] grow items-start min-h-px min-w-px relative shrink-0">
      <p className="font-['Anybody:ExtraBold',_sans-serif] font-bold leading-[1.64] relative shrink-0 text-[#111111] text-[15px] text-nowrap tracking-[-0.6px] whitespace-pre" style={{ fontVariationSettings: "'wdth' 137" }}>
        Dashboard
      </p>
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] min-w-full relative shrink-0 text-[#999999] text-[10px] w-[min-content]">{`Welcome back! Here's what's happening with Cstle Livn today.`}</p>
    </div>
  );
}

function Icon13() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M10 2H14V6" id="Vector" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 9.33333L14 2" id="Vector_2" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p25f66900} id="Vector_3" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white box-border content-stretch flex gap-[16px] items-center px-[13px] py-[8px] relative rounded-[6px] shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <Icon13 />
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[20px] relative shrink-0 text-[#111111] text-[14px] text-nowrap whitespace-pre">Google Reviews</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#848580] box-border content-stretch flex gap-[8px] h-[36px] items-center justify-center px-[16px] py-[8px] relative rounded-[6px] shrink-0" data-name="Button">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[20px] relative shrink-0 text-[14px] text-nowrap text-white whitespace-pre">Create New Project</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="basis-0 content-stretch flex gap-[10px] grow h-[36px] items-center justify-end min-h-px min-w-px relative shrink-0">
      <Button1 />
      <Button2 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="size-full">
        <div className="box-border content-stretch flex gap-[10px] items-start px-[32px] py-0 relative w-full">
          <Frame5 />
          <Frame4 />
        </div>
      </div>
    </div>
  );
}

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

function Frame16() {
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
      <Frame16 />
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

function Frame17() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Monthly Revenue</p>
      <LineChartUp02 />
    </div>
  );
}

function Frame18() {
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
      <Frame18 />
    </div>
  );
}

function NumberCard2() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame17 />
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

function Frame19() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Payments Due</p>
      <CoinsHand />
    </div>
  );
}

function Frame20() {
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
      <Frame20 />
    </div>
  );
}

function NumberCard3() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame19 />
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

function Frame21() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[12px] text-nowrap uppercase">Team Performance</p>
      <Activity />
    </div>
  );
}

function Frame22() {
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
      <Frame22 />
    </div>
  );
}

function NumberCard4() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0" data-name="numberCard" style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
          <Frame21 />
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

function Container3() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame7 />
      <CardContainer />
    </div>
  );
}

function DashboardNumberCardStrip() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Dashboard Number Card Strip">
      <div className="flex flex-col justify-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] items-start justify-center px-[34px] py-[8px] relative w-full">
          <Container3 />
        </div>
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[24px] relative shrink-0 w-[144.023px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24px] relative w-[144.023px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">Active Projects</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="h-[36px] relative rounded-[6px] shrink-0 w-[99.211px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[36px] items-center justify-center px-[16px] py-[8px] relative w-[99.211px]">
        <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[20px] relative shrink-0 text-[#111111] text-[14px] text-nowrap whitespace-pre">View All</p>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="h-[36px] relative shrink-0 w-full" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[36px] items-center justify-between relative w-full">
        <Heading3 />
        <Button3 />
      </div>
    </div>
  );
}

function Heading4() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">Riverside Penthouse Finishing</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[164px]">Client: Sarah Johnson</p>
    </div>
  );
}

function Container4() {
  return (
    <div className="basis-0 grow h-[49.5px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[6px] h-[49.5px] items-start relative w-full">
        <Heading4 />
        <Paragraph2 />
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[rgba(116,139,123,0.1)] relative rounded-[1.67772e+07px] shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center px-[12px] py-[4px] relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[#748b7b] text-[11px] text-nowrap whitespace-pre">On Track</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex h-[49.5px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container4 />
      <Text />
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[62.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[62.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] text-nowrap top-0 whitespace-pre">Painting</p>
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[23.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[23.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#111111] text-[13px] top-0 w-[24px]">75%</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Text1 />
      <Text2 />
    </div>
  );
}

function Container7() {
  return <div className="bg-[#848580] h-[8px] shrink-0 w-full" data-name="Container" />;
}

function PrimitiveDiv() {
  return (
    <div className="bg-[rgba(132,133,128,0.2)] box-border content-stretch flex flex-col h-[8px] items-start overflow-clip pr-[106.832px] py-0 relative rounded-[1.67772e+07px] shrink-0 w-full" data-name="Primitive.div">
      <Container7 />
    </div>
  );
}

function Icon14() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2599)" id="Icon">
          <path d="M8 4V8L10.6667 9.33333" id="Vector" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p39ee6532} id="Vector_2" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2599">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text3() {
  return (
    <div className="basis-0 grow h-[19.5px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-full">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[118px]">Due: 2025-11-15</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[141.023px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[19.5px] items-center relative w-[141.023px]">
        <Icon14 />
        <Text3 />
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[101.43px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[101.43px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[102px]">$338K / $450K</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container8 />
      <Text4 />
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[71px] items-start relative shrink-0 w-full" data-name="Container">
      <Container6 />
      <PrimitiveDiv />
      <Container9 />
    </div>
  );
}

function Container11() {
  return (
    <div className="bg-[#f7f7f7] h-[178.5px] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] h-[178.5px] items-start pb-px pt-[21px] px-[21px] relative w-full">
          <Container5 />
          <Container10 />
        </div>
      </div>
    </div>
  );
}

function Heading5() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">{`Downtown Loft Trim & Doors`}</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[149px]">Client: Marcus Chen</p>
    </div>
  );
}

function Container12() {
  return (
    <div className="basis-0 grow h-[49.5px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[6px] h-[49.5px] items-start relative w-full">
        <Heading5 />
        <Paragraph3 />
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="bg-[#ec554c] relative rounded-[1.67772e+07px] shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center px-[12px] py-[4px] relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[11px] text-nowrap text-white whitespace-pre">Delayed</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex h-[49.5px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container12 />
      <Text5 />
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[62.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[62.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] text-nowrap top-0 whitespace-pre">Final Inspection</p>
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[23.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[23.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#111111] text-[13px] top-0 w-[24px]">95%</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Text6 />
      <Text7 />
    </div>
  );
}

function Container15() {
  return <div className="bg-[#848580] h-[8px] shrink-0 w-[644px]" data-name="Container" />;
}

function PrimitiveDiv1() {
  return (
    <div className="bg-[rgba(132,133,128,0.2)] box-border content-stretch flex flex-col h-[8px] items-start overflow-clip pr-[235.03px] py-0 relative rounded-[1.67772e+07px] shrink-0 w-full" data-name="Primitive.div">
      <Container15 />
    </div>
  );
}

function Icon15() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2726)" id="Icon">
          <path d="M8 4V8L10.6667 9.33333" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p39ee6532} id="Vector_2" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2726">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text8() {
  return (
    <div className="basis-0 grow h-[19.5px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-full">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[13px] text-red-600 top-0 w-[118px]">Due: 2025-08-01</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[141.023px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[19.5px] items-center relative w-[141.023px]">
        <Icon15 />
        <Text8 />
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[101.43px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[101.43px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[102px]">$144K / $320K</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container16 />
      <Text9 />
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[71px] items-start relative shrink-0 w-full" data-name="Container">
      <Container14 />
      <PrimitiveDiv1 />
      <Container17 />
    </div>
  );
}

function Container19() {
  return (
    <div className="bg-[#f7f7f7] h-[178.5px] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] h-[178.5px] items-start pb-px pt-[21px] px-[21px] relative w-full">
          <Container13 />
          <Container18 />
        </div>
      </div>
    </div>
  );
}

function Heading6() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">Suburban Bungalow Renovation</p>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[164px]">Client: Emily Carter</p>
    </div>
  );
}

function Container20() {
  return (
    <div className="basis-0 grow h-[49.5px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[6px] h-[49.5px] items-start relative w-full">
        <Heading6 />
        <Paragraph4 />
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="bg-[rgba(116,139,123,0.1)] h-[24.5px] relative rounded-[1.67772e+07px] shrink-0 w-[96.617px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24.5px] relative w-[96.617px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[16.5px] left-[12px] text-[#748b7b] text-[11px] text-nowrap top-[4px] whitespace-pre">Not Started</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex h-[49.5px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container20 />
      <Text10 />
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[62.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[62.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] text-nowrap top-0 whitespace-pre">Planning</p>
      </div>
    </div>
  );
}

function Text12() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[23.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[23.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#111111] text-[13px] top-0 w-[24px]">0%</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Text11 />
      <Text12 />
    </div>
  );
}

function Container23() {
  return <div className="bg-[#848580] h-[8px] shrink-0 w-[89px]" data-name="Container" />;
}

function PrimitiveDiv2() {
  return (
    <div className="bg-[rgba(132,133,128,0.2)] box-border content-stretch flex flex-col h-[8px] items-start overflow-clip pr-[106.832px] py-0 relative rounded-[1.67772e+07px] shrink-0 w-full" data-name="Primitive.div">
      <Container23 />
    </div>
  );
}

function Icon16() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2599)" id="Icon">
          <path d="M8 4V8L10.6667 9.33333" id="Vector" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p39ee6532} id="Vector_2" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2599">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text13() {
  return (
    <div className="basis-0 grow h-[19.5px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-full">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[118px]">Due: 2026-01-20</p>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[141.023px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[19.5px] items-center relative w-[141.023px]">
        <Icon16 />
        <Text13 />
      </div>
    </div>
  );
}

function Text14() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[101.43px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[101.43px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[102px]">$80K / $120K</p>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container24 />
      <Text14 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[71px] items-start relative shrink-0 w-full" data-name="Container">
      <Container22 />
      <PrimitiveDiv2 />
      <Container25 />
    </div>
  );
}

function Container27() {
  return (
    <div className="bg-[#f7f7f7] h-[178.5px] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] h-[178.5px] items-start pb-px pt-[21px] px-[21px] relative w-full">
          <Container21 />
          <Container26 />
        </div>
      </div>
    </div>
  );
}

function Heading7() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">Suburban Bungalow Renovation</p>
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[164px]">Client: Emily Carter</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="basis-0 grow h-[49.5px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[6px] h-[49.5px] items-start relative w-full">
        <Heading7 />
        <Paragraph5 />
      </div>
    </div>
  );
}

function Text15() {
  return (
    <div className="bg-[#ec554c] relative rounded-[1.67772e+07px] shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center px-[12px] py-[4px] relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[11px] text-nowrap text-white whitespace-pre">Delayed</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex h-[49.5px] items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Container28 />
      <Text15 />
    </div>
  );
}

function Text16() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[62.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[62.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] text-nowrap top-0 whitespace-pre">Planning</p>
      </div>
    </div>
  );
}

function Text17() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[23.414px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[23.414px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#111111] text-[13px] top-0 w-[24px]">30%</p>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Text16 />
      <Text17 />
    </div>
  );
}

function Container31() {
  return <div className="bg-[#848580] h-[8px] shrink-0 w-[267px]" data-name="Container" />;
}

function PrimitiveDiv3() {
  return (
    <div className="bg-[rgba(132,133,128,0.2)] box-border content-stretch flex flex-col h-[8px] items-start overflow-clip pr-[106.832px] py-0 relative rounded-[1.67772e+07px] shrink-0 w-full" data-name="Primitive.div">
      <Container31 />
    </div>
  );
}

function Icon17() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2599)" id="Icon">
          <path d="M8 4V8L10.6667 9.33333" id="Vector" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p39ee6532} id="Vector_2" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_22_2599">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text18() {
  return (
    <div className="basis-0 grow h-[19.5px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-full">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[118px]">Due: 2026-01-20</p>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[141.023px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[19.5px] items-center relative w-[141.023px]">
        <Icon17 />
        <Text18 />
      </div>
    </div>
  );
}

function Text19() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[101.43px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[101.43px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] left-0 text-[#999999] text-[13px] top-0 w-[102px]">$80K / $120K</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex h-[19.5px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container32 />
      <Text19 />
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[71px] items-start relative shrink-0 w-full" data-name="Container">
      <Container30 />
      <PrimitiveDiv3 />
      <Container33 />
    </div>
  );
}

function Container35() {
  return (
    <div className="bg-[#f7f7f7] h-[178.5px] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] h-[178.5px] items-start pb-px pt-[21px] px-[21px] relative w-full">
          <Container29 />
          <Container34 />
        </div>
      </div>
    </div>
  );
}

function Dashboard1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[20px] items-start relative w-full">
        <Container11 />
        <Container19 />
        <Container27 />
        <Container35 />
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="basis-0 bg-[#f7f7f7] grow min-h-px min-w-px relative rounded-[12px] shrink-0" data-name="Card">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[52px] items-start p-[29px] relative w-full">
          <Dashboard />
          <Dashboard1 />
        </div>
      </div>
    </div>
  );
}

function Dashboard2() {
  return (
    <div className="relative shrink-0" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-start relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] relative shrink-0 text-[#111111] text-[16px] text-nowrap whitespace-pre">Upcoming Tasks</p>
      </div>
    </div>
  );
}

function Container36() {
  return <div className="bg-red-600 rounded-[1.67772e+07px] shrink-0 size-[8px]" data-name="Container" />;
}

function Paragraph6() {
  return (
    <div className="content-stretch flex flex-col font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[12px] uppercase w-full" data-name="Paragraph">
      <p className="min-w-full relative shrink-0 text-[#111111] w-[min-content]">Paint Master Bedroom</p>
      <p className="relative shrink-0 text-[#999999] text-nowrap whitespace-pre">2025-10-18</p>
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] relative shrink-0 text-[#999999] text-[10px] text-nowrap whitespace-pre">3 days</p>
    </div>
  );
}

function Container37() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[18px] grow items-start min-h-px min-w-px relative shrink-0" data-name="Container">
      <Paragraph6 />
      <Paragraph7 />
    </div>
  );
}

function Container38() {
  return (
    <div className="basis-0 content-stretch flex gap-[12px] grow items-start min-h-px min-w-px relative self-stretch shrink-0" data-name="Container">
      <Container36 />
      <Container37 />
    </div>
  );
}

function Icon18() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.pace200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2d59bff0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p163b1640} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container39() {
  return (
    <div className="bg-[#cecece] box-border content-stretch flex items-center justify-center mr-[-3px] relative rounded-[1.67772e+07px] shrink-0 size-[40px] z-[2]" data-name="Container">
      <div aria-hidden="true" className="absolute border-4 border-[#f7f7f7] border-solid inset-[-4px] pointer-events-none rounded-[1.67772e+07px]" />
      <Icon18 />
    </div>
  );
}

function Icon19() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.pace200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2d59bff0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p163b1640} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container40() {
  return (
    <div className="bg-[#cecece] box-border content-stretch flex items-center justify-center mr-[-3px] relative rounded-[1.67772e+07px] shrink-0 size-[40px] z-[1]" data-name="Container">
      <div aria-hidden="true" className="absolute border-4 border-[#f7f7f7] border-solid inset-[-4px] pointer-events-none rounded-[1.67772e+07px]" />
      <Icon19 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="box-border content-stretch flex isolate items-start pl-0 pr-[3px] py-0 relative shrink-0">
      <Container39 />
      <Container40 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[11px] grow items-end min-h-px min-w-px relative shrink-0">
      <Frame12 />
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] min-w-full relative shrink-0 text-[#999999] text-[10px] text-right w-[min-content]">Daniel, Sandra</p>
    </div>
  );
}

function Container41() {
  return (
    <div className="bg-[#f7f7f7] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex items-start justify-between p-[17px] relative w-full">
          <Container38 />
          <Frame11 />
        </div>
      </div>
    </div>
  );
}

function Container42() {
  return <div className="bg-[#008a2e] rounded-[1.67772e+07px] shrink-0 size-[8px]" data-name="Container" />;
}

function Paragraph8() {
  return (
    <div className="content-stretch flex flex-col font-['Roboto_Mono:Regular',_sans-serif] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[12px] uppercase w-full" data-name="Paragraph">
      <p className="min-w-full relative shrink-0 text-[#111111] w-[min-content]">Install LVP flooring</p>
      <p className="relative shrink-0 text-[#999999] text-nowrap whitespace-pre">2025-10-18</p>
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] relative shrink-0 text-[#999999] text-[10px] text-nowrap whitespace-pre">3 days</p>
    </div>
  );
}

function Container43() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[18px] grow items-start min-h-px min-w-px relative shrink-0" data-name="Container">
      <Paragraph8 />
      <Paragraph9 />
    </div>
  );
}

function Container44() {
  return (
    <div className="basis-0 content-stretch flex gap-[12px] grow items-start min-h-px min-w-px relative self-stretch shrink-0" data-name="Container">
      <Container42 />
      <Container43 />
    </div>
  );
}

function Icon20() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.pace200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2d59bff0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p163b1640} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container45() {
  return (
    <div className="bg-[#cecece] box-border content-stretch flex items-center justify-center mr-[-3px] relative rounded-[1.67772e+07px] shrink-0 size-[40px] z-[1]" data-name="Container">
      <div aria-hidden="true" className="absolute border-4 border-[#f7f7f7] border-solid inset-[-4px] pointer-events-none rounded-[1.67772e+07px]" />
      <Icon20 />
    </div>
  );
}

function Frame23() {
  return (
    <div className="box-border content-stretch flex isolate items-start pl-0 pr-[3px] py-0 relative shrink-0">
      <Container45 />
    </div>
  );
}

function Frame24() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[11px] grow items-end min-h-px min-w-px relative shrink-0">
      <Frame23 />
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[1.2] min-w-full relative shrink-0 text-[#999999] text-[10px] text-right w-[min-content]">Sandra</p>
    </div>
  );
}

function Container46() {
  return (
    <div className="bg-[#f7f7f7] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex items-start justify-between p-[17px] relative w-full">
          <Container44 />
          <Frame24 />
        </div>
      </div>
    </div>
  );
}

function Dashboard3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[16px] items-start relative w-full">
        <Container41 />
        <Container46 />
      </div>
    </div>
  );
}

function Card1() {
  return (
    <div className="bg-[#f7f7f7] box-border content-stretch flex flex-col gap-[44px] items-start p-[29px] relative rounded-[12px] shrink-0 w-[440px]" data-name="Card">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Dashboard2 />
      <Dashboard3 />
    </div>
  );
}

function Dashboard4() {
  return (
    <div className="relative shrink-0" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-start relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] relative shrink-0 text-[#111111] text-[16px] text-nowrap whitespace-pre">Recent Activity</p>
      </div>
    </div>
  );
}

function Icon21() {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.333%]" data-name="Vector">
        <div className="absolute inset-[-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 19">
            <path d={svgPaths.p1da8ee00} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[41.67%_37.5%]" data-name="Vector">
        <div className="absolute inset-[-25%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 6">
            <path d={svgPaths.p371ae280} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container47() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 size-[20px]" data-name="Container">
      <Icon21 />
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[24px] min-h-px min-w-px relative shrink-0 text-[#111111] text-[16px]">{`Maria Santos completed task "Paint Master Bedroom"`}</p>
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[#999999] text-[13px] text-nowrap whitespace-pre">2 hours ago</p>
    </div>
  );
}

function Container48() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[6px] grow items-start min-h-px min-w-px relative shrink-0" data-name="Container">
      <Paragraph10 />
      <Paragraph11 />
    </div>
  );
}

function Container49() {
  return (
    <div className="box-border content-stretch flex gap-[12px] items-start justify-center px-0 py-[12px] relative shrink-0 w-full" data-name="Container">
      <Container47 />
      <Container48 />
    </div>
  );
}

function Icon22() {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.333%]" data-name="Vector">
        <div className="absolute inset-[-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 19">
            <path d={svgPaths.p1da8ee00} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[41.67%_37.5%]" data-name="Vector">
        <div className="absolute inset-[-25%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 6">
            <path d={svgPaths.p371ae280} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container50() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 size-[20px]" data-name="Container">
      <Icon22 />
    </div>
  );
}

function Paragraph12() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[24px] min-h-px min-w-px relative shrink-0 text-[#111111] text-[16px]">{`John Davis added comment to "Install crown molding"`}</p>
    </div>
  );
}

function Paragraph13() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[#999999] text-[13px] text-nowrap whitespace-pre">5 hours ago</p>
    </div>
  );
}

function Container51() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[6px] grow items-start min-h-px min-w-px relative shrink-0" data-name="Container">
      <Paragraph12 />
      <Paragraph13 />
    </div>
  );
}

function Container52() {
  return (
    <div className="box-border content-stretch flex gap-[12px] items-start justify-center px-0 py-[12px] relative shrink-0 w-full" data-name="Container">
      <Container50 />
      <Container51 />
    </div>
  );
}

function Icon23() {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.333%]" data-name="Vector">
        <div className="absolute inset-[-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 19">
            <path d={svgPaths.p1da8ee00} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[41.67%_37.5%]" data-name="Vector">
        <div className="absolute inset-[-25%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 6">
            <path d={svgPaths.p371ae280} id="Vector" stroke="var(--stroke-0, #748B7B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container53() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 size-[20px]" data-name="Container">
      <Icon23 />
    </div>
  );
}

function Paragraph14() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Roboto_Mono:Regular',_sans-serif] font-normal grow leading-[24px] min-h-px min-w-px relative shrink-0 text-[#111111] text-[16px]">{`Lisa Chen updated status on "Repair kitchen sink"`}</p>
    </div>
  );
}

function Paragraph15() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[#999999] text-[13px] text-nowrap whitespace-pre">1 hour ago</p>
    </div>
  );
}

function Container54() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[6px] grow items-start min-h-px min-w-px relative shrink-0" data-name="Container">
      <Paragraph14 />
      <Paragraph15 />
    </div>
  );
}

function Container55() {
  return (
    <div className="box-border content-stretch flex gap-[12px] items-start justify-center px-0 py-[12px] relative shrink-0 w-full" data-name="Container">
      <Container53 />
      <Container54 />
    </div>
  );
}

function Dashboard5() {
  return (
    <div className="relative shrink-0 w-full" data-name="Dashboard">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[20px] items-start relative w-full">
        <Container49 />
        <Container52 />
        <Container55 />
      </div>
    </div>
  );
}

function Card2() {
  return (
    <div className="bg-[#f7f7f7] relative rounded-[12px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[44px] items-start p-[29px] relative w-full">
          <Dashboard4 />
          <Dashboard5 />
        </div>
      </div>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[29px] items-start relative shrink-0">
      <Card1 />
      <Card2 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="size-full">
        <div className="box-border content-stretch flex gap-[29px] items-start px-[34px] py-0 relative w-full">
          <Card />
          <Frame13 />
        </div>
      </div>
    </div>
  );
}

function App11() {
  return (
    <div className="basis-0 content-stretch flex flex-col gap-[29px] grow items-start min-h-px min-w-px relative shrink-0" data-name="App">
      <Header />
      <Frame3 />
      <DashboardNumberCardStrip />
      <Frame10 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full">
      <SidebarOpen />
      <App11 />
    </div>
  );
}

function CompanyLinksContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[25px] items-start relative shrink-0" data-name="Company links container">
      <div className="flex flex-col font-['Roboto_Mono:Regular',_sans-serif] font-normal justify-center leading-[1.2] relative shrink-0 text-[#cccccc] text-[12px] text-nowrap uppercase whitespace-pre">
        <p className="mb-0">LICENSES</p>
        <p>INSURANCE</p>
      </div>
    </div>
  );
}

function InformationLinksContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[25px] items-start relative shrink-0" data-name="Information links container">
      <div className="flex flex-col font-['Roboto_Mono:Regular',_sans-serif] font-normal justify-center leading-[1.2] relative shrink-0 text-[#cccccc] text-[12px] uppercase w-[146.13px]">
        <p className="mb-0">COMPANY Policy</p>
        <p>COMPLIANCE</p>
      </div>
    </div>
  );
}

function FooterLinksContainer() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[355.779px]" data-name="Footer links container">
      <CompanyLinksContainer />
      <InformationLinksContainer />
    </div>
  );
}

function SocialIcons() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Social Icons">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2571)" id="Social Icons">
          <path d={svgPaths.pf942f00} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p82b6300} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p890df80} fill="var(--fill-0, white)" id="Vector_3" />
        </g>
        <defs>
          <clipPath id="clip0_22_2571">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function SocialIcons1() {
  return (
    <div className="h-[16px] relative shrink-0 w-[17.073px]" data-name="Social Icons">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 16">
        <g clipPath="url(#clip0_22_2678)" id="Social Icons">
          <path d={svgPaths.p399459f0} fill="var(--fill-0, white)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_22_2678">
            <rect fill="white" height="16" width="17.0728" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function SocialIcons2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Social Icons">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Social Icons">
          <path d={svgPaths.p1ed3a780} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function SocialIcons3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Social Icons">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_22_2693)" id="Social Icons">
          <path d={svgPaths.p114d3270} fill="var(--fill-0, white)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_22_2693">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function SocialIconsContainer() {
  return (
    <div className="content-stretch flex gap-[23px] items-start relative shrink-0" data-name="Social icons container">
      <SocialIcons />
      <SocialIcons1 />
      <SocialIcons2 />
      <SocialIcons3 />
    </div>
  );
}

function ReviewContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[50px] items-start relative shrink-0" data-name="Review container">
      <SocialIconsContainer />
    </div>
  );
}

function FooterContainer() {
  return (
    <div className="bg-black relative shrink-0 w-full" data-name="Footer container">
      <div aria-hidden="true" className="absolute border-[#999999] border-[1px_0px] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex items-center justify-between px-[100px] py-[43px] relative w-full">
          <FooterLinksContainer />
          <ReviewContainer />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard6() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[70px] items-start relative size-full" data-name="DASHBOARD">
      <Frame2 />
      <FooterContainer />
    </div>
  );
}