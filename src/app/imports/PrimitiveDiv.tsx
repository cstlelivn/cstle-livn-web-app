import svgPaths from "./svg-irwlcgai14";

function PrimitiveH2() {
  return (
    <div className="h-[18px] relative shrink-0 w-[462px]" data-name="Primitive.h2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[18px] relative w-[462px]">
        <p className="absolute font-['Anybody:ExtraBold',_sans-serif] font-extrabold leading-[18px] left-0 text-[#111111] text-[18px] text-nowrap top-[-0.5px] whitespace-pre" style={{ fontVariationSettings: "'wdth' 100" }}>
          Create New Project
        </p>
      </div>
    </div>
  );
}

function PrimitiveP() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0 w-[462px]" data-name="Primitive.p">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-full relative w-[462px]">
        <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] left-0 text-[#999999] text-[14px] top-[-0.5px] w-[446px]">Fill in the details below to create a new project for Cstle Livn.</p>
      </div>
    </div>
  );
}

function DialogHeader() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[66px] items-start left-[25px] top-[-365px] w-[462px]" data-name="DialogHeader">
      <PrimitiveH2 />
      <PrimitiveP />
    </div>
  );
}

function SelectItemText() {
  return (
    <div className="h-0 relative shrink-0 w-full" data-name="SelectItemText">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] left-0 text-[#111111] text-[16px] top-0 w-0">Marcus Chen</p>
    </div>
  );
}

function SelectItemText1() {
  return (
    <div className="h-0 relative shrink-0 w-full" data-name="SelectItemText">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] left-0 text-[#111111] text-[16px] top-0 w-0">Sarah Johnson</p>
    </div>
  );
}

function SelectItemText2() {
  return (
    <div className="h-0 relative shrink-0 w-full" data-name="SelectItemText">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] left-0 text-[#111111] text-[16px] top-0 w-0">Emily Rodriguez</p>
    </div>
  );
}

function SlotClone() {
  return (
    <div className="absolute left-[24px] size-px top-[-168px]" data-name="SlotClone">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col items-start pb-0 pr-[332.5px] pt-[128.898px] relative size-px">
          <SelectItemText />
          <SelectItemText1 />
          <SelectItemText2 />
        </div>
      </div>
    </div>
  );
}

function SelectItemText3() {
  return (
    <div className="h-0 relative shrink-0 w-full" data-name="SelectItemText">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] left-0 text-[#111111] text-[16px] top-0 w-0">Default (Cstle Livn)</p>
    </div>
  );
}

function SlotClone1() {
  return (
    <div className="absolute box-border content-stretch flex flex-col items-start left-[24px] pb-0 pr-[332.5px] size-px top-[239px]" data-name="SlotClone">
      <SelectItemText3 />
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-0 size-[16px] top-0" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M12 4L4 12" id="Vector" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M4 4L12 12" id="Vector_2" stroke="var(--stroke-0, #111111)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function DialogContent() {
  return (
    <div className="absolute left-[-1px] overflow-clip size-px top-[15px]" data-name="DialogContent">
      <p className="absolute font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[24px] left-0 text-[#111111] text-[16px] text-nowrap top-0 whitespace-pre">Close</p>
    </div>
  );
}

function PrimitiveButton() {
  return (
    <div className="absolute left-[479px] opacity-70 rounded-[2px] size-[16px] top-[-373px]" data-name="Primitive.button">
      <Icon />
      <DialogContent />
    </div>
  );
}

function PrimitiveLabel() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Project Title</p>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">Enter project title</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container() {
  return (
    <div className="absolute content-stretch flex flex-col h-[50px] items-start left-0 top-0 w-[462px]" data-name="Container">
      <PrimitiveLabel />
      <Input />
    </div>
  );
}

function PrimitiveLabel1() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Client</p>
    </div>
  );
}

function PrimitiveSpan() {
  return (
    <div className="h-[20px] relative shrink-0 w-[109.219px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[20px] items-center overflow-clip relative rounded-[inherit] w-[109.219px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">Select client</p>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[36px] items-center justify-between px-[13px] py-px relative w-full">
          <PrimitiveSpan />
          <Icon1 />
        </div>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute content-stretch flex flex-col h-[50px] items-start left-0 top-[66px] w-[462px]" data-name="Container">
      <PrimitiveLabel1 />
      <PrimitiveButton1 />
    </div>
  );
}

function PrimitiveLabel2() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Location</p>
    </div>
  );
}

function Input1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">Project Address</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 top-[132.2px] w-[462px]" data-name="Container">
      <PrimitiveLabel2 />
      <Input1 />
    </div>
  );
}

function PrimitiveLabel3() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Budget ($)</p>
    </div>
  );
}

function Input2() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">0</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute content-stretch flex flex-col h-[50px] items-start left-[239px] top-[198px] w-[223px]" data-name="Container">
      <PrimitiveLabel3 />
      <Input2 />
    </div>
  );
}

function PrimitiveLabel4() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Start Date</p>
    </div>
  );
}

function Input3() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute content-stretch flex flex-col h-[50px] items-start left-0 top-[198px] w-[223px]" data-name="Container">
      <PrimitiveLabel4 />
      <Input3 />
    </div>
  );
}

function PrimitiveLabel5() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Description</p>
    </div>
  );
}

function Textarea() {
  return (
    <div className="bg-white h-[64px] relative rounded-[6px] shrink-0 w-full" data-name="Textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[64px] items-start px-[12px] py-[8px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[20px] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">Project description (optional)</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Container5() {
  return (
    <div className="absolute content-stretch flex flex-col h-[78px] items-start left-0 top-[264px] w-[462px]" data-name="Container">
      <PrimitiveLabel5 />
      <Textarea />
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[342px] relative shrink-0 w-full" data-name="Container">
      <Container />
      <Container1 />
      <Container2 />
      <Container3 />
      <Container4 />
      <Container5 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex font-['Roboto_Mono:Bold',_sans-serif] font-bold items-center justify-between leading-[21px] relative shrink-0 text-[#111111] text-[12px] text-nowrap w-full whitespace-pre" data-name="Heading 3">
      <p className="relative shrink-0">{`Project Phases & Timeline`}</p>
      <p className="relative shrink-0">Choose Template</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[#999999] text-[9px] w-[239.792px]">Choose a template, pick individual phases, or create custom phases with durations</p>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Heading3 />
      <Paragraph />
    </div>
  );
}

function PrimitiveLabel6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Add a Phase</p>
    </div>
  );
}

function Input4() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">Phase name...</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#858585] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321470() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative w-full">
        <PrimitiveLabel6 />
        <Input4 />
      </div>
    </div>
  );
}

function PrimitiveLabel7() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0" data-name="Primitive.label">
      <p className="font-['Roboto_Mono:Medium',_sans-serif] font-medium leading-[14px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Days</p>
    </div>
  );
}

function Input5() {
  return (
    <div className="bg-white h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999999] text-[12px] text-nowrap whitespace-pre">1</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#858585] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321471() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <PrimitiveLabel7 />
        <Input5 />
      </div>
    </div>
  );
}

function PrimitiveLabel8() {
  return <div className="content-stretch flex flex-col gap-[8px] items-start justify-center shrink-0" data-name="Primitive.label" />;
}

function Icon2() {
  return (
    <div className="basis-0 grow h-[12px] min-h-px min-w-px relative shrink-0" data-name="Icon">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[12px] overflow-clip relative rounded-[inherit] w-full">
        <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
          <div className="absolute inset-[-0.5px_-7.14%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 2">
              <path d="M1 1H8" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-[20.83%] left-1/2 right-1/2 top-[20.83%]" data-name="Vector">
          <div className="absolute inset-[-7.14%_-0.5px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 9">
              <path d="M1 1V8" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#748b7b] box-border content-stretch flex items-center px-[12px] py-0 relative rounded-[6px] shrink-0 size-[36px]" data-name="Button">
      <Icon2 />
    </div>
  );
}

function Frame427321472() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start justify-center relative">
        <PrimitiveLabel8 />
        <Button />
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame427321470 />
      <Frame427321471 />
      <Frame427321472 />
    </div>
  );
}

function Input6() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0" data-name="Input">
      <div className="box-border content-stretch flex h-[36px] items-center justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit]">
        <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">SN</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321475() {
  return (
    <div className="relative shrink-0 w-[39px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-center justify-center relative w-[39px]">
        <Input6 />
      </div>
    </div>
  );
}

function Input7() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">Phase</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321473() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative w-full">
        <Input7 />
      </div>
    </div>
  );
}

function Input8() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">% Rate</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321476() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input8 />
      </div>
    </div>
  );
}

function Input9() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">Days</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321474() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input9 />
      </div>
    </div>
  );
}

function Trash01() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-01">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border size-[16px]" />
    </div>
  );
}

function Button1() {
  return (
    <div className="box-border content-stretch flex items-center justify-center px-[12px] py-0 relative rounded-[6px] shrink-0 size-[36px]" data-name="Button">
      <Trash01 />
    </div>
  );
}

function Frame427321477() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start justify-center relative">
        <Button1 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame427321475 />
      <Frame427321473 />
      <Frame427321476 />
      <Frame427321474 />
      <Frame427321477 />
    </div>
  );
}

function Input10() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0" data-name="Input">
      <div className="box-border content-stretch flex h-[36px] items-center justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">1.</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321478() {
  return (
    <div className="relative shrink-0 w-[39px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-center justify-center relative w-[39px]">
        <Input10 />
      </div>
    </div>
  );
}

function Input11() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">Prepping</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321479() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative w-full">
        <Input11 />
      </div>
    </div>
  );
}

function Input12() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">16.7%</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321480() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input12 />
      </div>
    </div>
  );
}

function Input13() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">1</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321481() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input13 />
      </div>
    </div>
  );
}

function Trash2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-01">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-01">
          <path d={svgPaths.pd888200} id="Icon" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="box-border content-stretch flex items-center justify-center px-[12px] py-0 relative rounded-[6px] shrink-0 size-[36px]" data-name="Button">
      <Trash2 />
    </div>
  );
}

function Frame427321482() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start justify-center relative">
        <Button2 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame427321478 />
      <Frame427321479 />
      <Frame427321480 />
      <Frame427321481 />
      <Frame427321482 />
    </div>
  );
}

function Input14() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0" data-name="Input">
      <div className="box-border content-stretch flex h-[36px] items-center justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">2.</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321483() {
  return (
    <div className="relative shrink-0 w-[39px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-center justify-center relative w-[39px]">
        <Input14 />
      </div>
    </div>
  );
}

function Input15() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">Primmimg</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321484() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative w-full">
        <Input15 />
      </div>
    </div>
  );
}

function Input16() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">50.0%</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321485() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input16 />
      </div>
    </div>
  );
}

function Input17() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">3</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321486() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input17 />
      </div>
    </div>
  );
}

function Trash3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-01">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-01">
          <path d={svgPaths.pd888200} id="Icon" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="box-border content-stretch flex items-center justify-center px-[12px] py-0 relative rounded-[6px] shrink-0 size-[36px]" data-name="Button">
      <Trash3 />
    </div>
  );
}

function Frame427321487() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start justify-center relative">
        <Button3 />
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame427321483 />
      <Frame427321484 />
      <Frame427321485 />
      <Frame427321486 />
      <Frame427321487 />
    </div>
  );
}

function Input18() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0" data-name="Input">
      <div className="box-border content-stretch flex h-[36px] items-center justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">3.</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321488() {
  return (
    <div className="relative shrink-0 w-[39px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-center justify-center relative w-[39px]">
        <Input18 />
      </div>
    </div>
  );
}

function Input19() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">1st Coat Painting</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321489() {
  return (
    <div className="basis-0 grow min-h-px min-w-px relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative w-full">
        <Input19 />
      </div>
    </div>
  );
}

function Input20() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">33.3%</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321490() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input20 />
      </div>
    </div>
  );
}

function Input21() {
  return (
    <div className="bg-[#f7f7f7] h-[36px] relative rounded-[6px] shrink-0 w-[70px]" data-name="Input">
      <div className="box-border content-stretch flex flex-col h-[36px] items-start justify-center overflow-clip px-[12px] py-[4px] relative rounded-[inherit] w-[70px]">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-black text-nowrap whitespace-pre">2</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#f7f7f7] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Frame427321491() {
  return (
    <div className="relative shrink-0">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start relative">
        <Input21 />
      </div>
    </div>
  );
}

function AlignVerticalCenter01() {
  return (
    <div className="absolute left-[402px] size-[16px] top-[10px]" data-name="align-vertical-center-01">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="align-vertical-center-01">
          <path d={svgPaths.p21e395c0} id="Icon" stroke="var(--stroke-0, #D1D1D1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M14 6H2" id="Icon_2" stroke="var(--stroke-0, #D1D1D1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M14 8H2" id="Icon_3" stroke="var(--stroke-0, #D1D1D1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M14 10H2" id="Icon_4" stroke="var(--stroke-0, #D1D1D1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p58b96c0} id="Icon_5" stroke="var(--stroke-0, #D1D1D1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Trash4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-01">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-01">
          <path d={svgPaths.pd888200} id="Icon" stroke="var(--stroke-0, #999999)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[36px] items-center justify-center px-[12px] py-0 relative rounded-[6px] shrink-0" data-name="Button">
      <Trash4 />
    </div>
  );
}

function Frame427321492() {
  return (
    <div className="relative shrink-0 w-[36px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[4px] items-start justify-center relative w-[36px]">
        <Button4 />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Frame427321488 />
      <Frame427321489 />
      <Frame427321490 />
      <Frame427321491 />
      <AlignVerticalCenter01 />
      <Frame427321492 />
    </div>
  );
}

function Frame427321493() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Container9 />
      <Container10 />
      <Container11 />
      <Container12 />
    </div>
  );
}

function Container13() {
  return (
    <div className="box-border content-stretch flex flex-col gap-[20px] items-start pb-0 pt-[25px] px-0 relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#858585] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
      <Container7 />
      <Container8 />
      <Frame427321493 />
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#858585] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center p-[8px] relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[21px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Save As</p>
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="bg-white relative rounded-[6px] shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#858585] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative">
        <p className="font-['Roboto_Mono:Regular',_sans-serif] font-normal leading-[21px] relative shrink-0 text-[#111111] text-[12px] text-nowrap whitespace-pre">Cancel</p>
      </div>
    </div>
  );
}

function Button7() {
  return (
    <div className="basis-0 bg-[#748b7b] grow min-h-px min-w-px relative rounded-[6px] shrink-0" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[10px] items-center justify-center px-[15px] py-[8px] relative w-full">
          <p className="font-['Roboto_Mono:Bold',_sans-serif] font-bold leading-[21px] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre">Create Project (6 days)</p>
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="box-border content-stretch flex gap-[8px] h-[56px] items-center justify-center pb-0 pt-[17px] px-0 relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#858585] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
      <Button5 />
      <Button6 />
      <Button7 />
    </div>
  );
}

function CreateProjectDialog() {
  return (
    <div className="absolute bg-[#f7f7f7] content-stretch flex flex-col gap-[24px] items-start left-1/2 top-[calc(50%-86.398px)] translate-x-[-50%] translate-y-[-50%] w-[462px]" data-name="CreateProjectDialog">
      <Container6 />
      <Container13 />
      <Container14 />
    </div>
  );
}

export default function PrimitiveDiv() {
  return (
    <div className="bg-[#f7f7f7] relative rounded-[8px] size-full" data-name="Primitive.div">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <DialogHeader />
        <SlotClone />
        <SlotClone1 />
        <PrimitiveButton />
        <CreateProjectDialog />
      </div>
      <div aria-hidden="true" className="absolute border border-[#858585] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
    </div>
  );
}