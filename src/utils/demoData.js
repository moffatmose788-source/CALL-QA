const DEMO_AGENTS = [
  'Moffat Mayaka', 'Maxwell Njoroge', 'Janet Wanjiku',
  'Grace Auma', 'David Kimani', 'Eunice Mwangi', 'Brian Otieno',
];

const DEMO_CUSTOMERS = [
  'John Kamau','Sarah Otieno','Peter Mwangi','Grace Njeri','Tom Ochieng',
  'Alice Muthoni','Ruth Achieng','James Kibe','Mary Wambua','Paul Ndungu',
  'Lydia Auma','Robert Otieno','Esther Nyambura','Charles Mutua','Anne Wachira',
  'Brian Omondi','Catherine Njeru','Dennis Mwas','Elizabeth Kariuki','Francis Kamwendo',
];

const AMOUNTS = ['1,500','2,200','3,800','4,500','5,600','6,000','7,200','8,900','2,100','3,200'];
const PRODUCTS = ['Smartphone Premium','Laptop Basic','Tablet Pro','Feature Phone','Smartwatch'];

const TEMPLATES = [
  {
    lang:'EN', quality:'high',
    make:(a,c,amt)=>`Good morning, my name is ${a} calling from Mobile Recovery. May I please speak with ${c}? How are you today? Thank you. I am calling regarding your outstanding device repayment. Before we proceed please confirm your account number and date of birth for compliance and verification. Thank you ${c}. Your outstanding balance is KES ${amt} which is overdue. I fully understand this and I appreciate your patience. I would like to explain your balance and negotiate a flexible payment plan — you can settle in installments. Can you commit to a payment by end of this month? I can also explain our device insurance policy if needed. We will send full details via SMS within 24 hours. Is there anything else I can help you with? It has been a pleasure speaking with you. Thank you, have a wonderful day, goodbye.`,
  },
  {
    lang:'SW', quality:'high',
    make:(a,c,amt)=>`Habari za asubuhi. Jina langu ni ${a} kutoka Mobile Recovery. Naweza kuzungumza na ${c}? Habari yako? Asante sana. Ninapigia kuhusu deni lako la simu ambalo lipo outstanding. Tafadhali thibitisha nambari yako ya akaunti na tarehe ya kuzaliwa kwa usalama na uthibitisho. Asante ${c}. Salio lako ni shilingi ${amt} ambalo limechelewa. Naelewa hali yako na nakushukuru kwa subira yako. Ningependa kueleza salio lako na kupanga mpango wa malipo. Je unaweza kukubaliana kulipa mwezi huu? Tutakutumia maelezo yote kwa SMS ndani ya masaa 24. Kuna kitu kingine ninachoweza kukusaidia? Asante sana ${c}. Siku njema, kwa heri.`,
  },
  {
    lang:'EN', quality:'mid',
    make:(a,c,amt)=>`Hello this is ${a} from collections. I need to speak with ${c}. Good morning. I am calling about your outstanding balance of KES ${amt}. Can you confirm your account number? I understand your situation. We have a payment arrangement if you would like to settle this. Can you commit to a payment date? I will send the details and terms. Thank you, goodbye.`,
  },
  {
    lang:'SW', quality:'mid',
    make:(a,c,amt)=>`Habari ${c}. Mimi ni ${a} kutoka Recovery. Ninapigia kuhusu deni lako la shilingi ${amt}. Je unaweza thibitisha akaunti yako? Naelewa. Tunaweza kupanga malipo. Je unaweza kulipa lini? Tutakutumia ujumbe. Asante, kwa heri.`,
  },
  {
    lang:'EN', quality:'low',
    make:(a,c,amt)=>`${a} calling. Your account balance is ${amt} overdue. Pay today or we escalate. When can you pay? I will call back. Bye.`,
  },
  {
    lang:'EN', quality:'low',
    make:(a,c,amt)=>`Collections for ${c}. Balance KES ${amt}. Pay now. No plan? I will mark as uncooperative. Goodbye.`,
  },
];

let counter = 10001;

export function generateDemoCSVData(agentsCount = 5, callsPerAgent = 350) {
  const agents = DEMO_AGENTS.slice(0, agentsCount);
  const rows = [];
  agents.forEach(agent => {
    const firstName = agent.split(' ')[0];
    for (let i = 0; i < callsPerAgent; i++) {
      const r = Math.random();
      const tplIdx = r < 0.35
        ? (Math.random() < 0.5 ? 0 : 1)
        : r < 0.70
          ? (Math.random() < 0.5 ? 2 : 3)
          : (Math.random() < 0.5 ? 4 : 5);
      const tpl = TEMPLATES[tplIdx];
      const cust = DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length];
      const amt = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
      const date = new Date(2025, 5, 15 - Math.floor(i / 80)).toISOString().slice(0, 10);
      rows.push({
        'Agent Name': agent,
        'Call ID': `C-${counter++}`,
        'Customer Name': cust,
        'Customer ID': `CUS-${2000 + i}`,
        'Date': date,
        'Transcript': tpl.make(firstName, cust, amt),
        'Product': PRODUCTS[i % PRODUCTS.length],
        'Balance': `KES ${amt}`,
      });
    }
  });
  return rows;
}
