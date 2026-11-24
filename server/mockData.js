// Initial mock data for Sahay-Setu Disaster Relief Platform
// This data serves as the fallback when MongoDB is not connected,
// and automatically seeds into MongoDB on first connection so you can edit it via MongoDB Compass / Atlas.

const mockAlerts = [
  {
    title: "Flash Flood Warning - Brahmaputra River Basin",
    type: "Flood",
    area: "Assam (Kamrup, Dibrugarh, Majuli)",
    severity: "Critical",
    population: "250,000+",
    message: "River levels have exceeded danger marks. Low-lying areas must evacuate immediately to designated relief shelters.",
    status: "Active",
    createdAt: new Date("2026-11-24T10:00:00Z")
  },
  {
    title: "Severe Cyclonic Storm Advisory - Bay of Bengal",
    type: "Cyclone",
    area: "Odisha Coast (Puri, Ganjam, Jagatsinghpur)",
    severity: "High",
    population: "400,000+",
    message: "Wind gusts up to 110 km/h expected. Fishermen advised not to venture into deep sea. Coastal shelters activated.",
    status: "Active",
    createdAt: new Date("2026-11-24T08:30:00Z")
  },
  {
    title: "Landslide Risk Alert - Chamoli & Rudraprayag",
    type: "Landslide",
    area: "Uttarakhand (Joshimath, Badrinath Highway)",
    severity: "High",
    population: "35,000+",
    message: "Heavy rains triggered slope instability along NH-58. Non-essential travel prohibited.",
    status: "Active",
    createdAt: new Date("2026-11-23T16:00:00Z")
  },
  {
    title: "Severe Heatwave Warning - Red Alert",
    type: "Heatwave",
    area: "Rajasthan (Barmer, Jaisalmer, Bikaner)",
    severity: "Medium",
    population: "180,000+",
    message: "Daytime temperatures forecasted above 47°C. Avoid direct sun exposure between 11 AM and 4 PM.",
    status: "Active",
    createdAt: new Date("2026-11-23T12:00:00Z")
  },
  {
    title: "Urban Waterlogging & High Tide Advisory",
    type: "Flood",
    area: "Maharashtra (Mumbai Coastal, Thane)",
    severity: "Medium",
    population: "500,000+",
    message: "High tide of 4.4 meters combined with heavy spells. Emergency pumping stations active.",
    status: "Active",
    createdAt: new Date("2026-11-23T09:15:00Z")
  }
];

const mockNgos = [
  {
    publicId: "65b4c1001122334455667701",
    _id: "65b4c1001122334455667701",
    organizationName: "Goonj Disaster Relief Initiative",
    location: "New Delhi, Delhi",
    specialties: ["Clothing & Essentials", "Family Relief Kits", "Community Rebuilding"],
    status: "Approved",
    registrationNumber: "NGO-DL-2018-0914",
    createdAt: new Date("2026-09-10")
  },
  {
    publicId: "65b4c1001122334455667702",
    _id: "65b4c1001122334455667702",
    organizationName: "SEEDS India Disaster Response",
    location: "Noida, Uttar Pradesh",
    specialties: ["Emergency Shelter", "Safe Water Systems", "Rapid Assessment"],
    status: "Approved",
    registrationNumber: "NGO-UP-2015-4421",
    createdAt: new Date("2026-09-14")
  },
  {
    publicId: "65b4c1001122334455667703",
    _id: "65b4c1001122334455667703",
    organizationName: "Odisha Disaster Volunteers Network",
    location: "Bhubaneswar, Odisha",
    specialties: ["Cyclone Evacuation", "Food & Ration Packets", "First Aid"],
    status: "Approved",
    registrationNumber: "NGO-OD-2019-3382",
    createdAt: new Date("2026-09-20")
  },
  {
    publicId: "65b4c1001122334455667704",
    _id: "65b4c1001122334455667704",
    organizationName: "Assam Flood Rescue & Relief Trust",
    location: "Guwahati, Assam",
    specialties: ["Boat Rescue", "Water Purification", "Mobile Medical Care"],
    status: "Approved",
    registrationNumber: "NGO-AS-2020-7719",
    createdAt: new Date("2026-09-28")
  },
  {
    publicId: "65b4c1001122334455667705",
    _id: "65b4c1001122334455667705",
    organizationName: "Himalayan Emergency Support Cell",
    location: "Dehradun, Uttarakhand",
    specialties: ["Search & Rescue", "Cold Weather Shelters", "Medical Supplies"],
    status: "Approved",
    registrationNumber: "NGO-UK-2021-1102",
    createdAt: new Date("2026-10-05")
  },
  {
    publicId: "65b4c1001122334455667706",
    _id: "65b4c1001122334455667706",
    organizationName: "Coastal Disaster Relief Force",
    location: "Puri, Odisha",
    specialties: ["Coastal Evacuation", "Drinking Water Supply", "Temporary Shelters"],
    status: "Pending",
    registrationNumber: "NGO-OD-2026-8812",
    createdAt: new Date("2026-10-18")
  },
  {
    publicId: "65b4c1001122334455667707",
    _id: "65b4c1001122334455667707",
    organizationName: "Bihar Flood Volunteers Network",
    location: "Patna, Bihar",
    specialties: ["Boat Rescue", "Food Rations", "Emergency Medical Camp"],
    status: "Pending",
    registrationNumber: "NGO-BR-2026-3190",
    createdAt: new Date("2026-10-21")
  },
  {
    publicId: "65b4c1001122334455667708",
    _id: "65b4c1001122334455667708",
    organizationName: "Kerala Mountain Emergency Aid",
    location: "Wayanad, Kerala",
    specialties: ["Landslide Recovery", "Medical First Aid", "Community Kitchens"],
    status: "Pending",
    registrationNumber: "NGO-KL-2026-5541",
    createdAt: new Date("2026-10-24")
  }
];

const mockReliefResources = [
  {
    name: "Kamrup Flood Shelter & Relief Hub",
    type: "Shelter",
    label: "Emergency Shelter Camp",
    location: "Guwahati, Assam",
    distance: "1.2 km away",
    details: "Capacity: 500 persons. Equipped with dry food, clean drinking water, sanitation, and medical triage.",
    status: "Available",
    active: true,
    quantity: 500,
    available: 380,
    total: 500
  },
  {
    name: "Odisha Coastal Rapid Medical Mobile Unit",
    type: "Medical",
    label: "Mobile Medical Clinic",
    location: "Puri, Odisha",
    distance: "3.5 km away",
    details: "Doctors on duty 24/7. First aid, anti-venom, ORS, chlorine tablets, and trauma care available.",
    status: "Operational",
    active: true,
    quantity: 150,
    available: 110,
    total: 150
  },
  {
    name: "Barmer Clean Water Distribution Point",
    type: "Water",
    label: "Drinking Water Supply",
    location: "Barmer, Rajasthan",
    distance: "2.1 km away",
    details: "RO filtered water tankers, 20L cans distribution, and electrolytes support for heatwave relief.",
    status: "Available",
    active: true,
    quantity: 12000,
    available: 9500,
    total: 12000
  },
  {
    name: "Chamoli Emergency Food Supply Depot",
    type: "Food",
    label: "Food Ration Center",
    location: "Joshimath, Uttarakhand",
    distance: "4.0 km away",
    details: "Ready-to-eat meals, infant milk powder, grains, and dry rations for 7-day family sustenance.",
    status: "Available",
    active: true,
    quantity: 2000,
    available: 1640,
    total: 2000
  },
  {
    name: "Brahmaputra Inflatable Rescue Boats Unit",
    type: "Rescue",
    label: "Water Rescue Equipment",
    location: "Dibrugarh, Assam",
    distance: "0.8 km away",
    details: "12 motorboats with trained NDRF & volunteer divers for flood evacuations.",
    status: "Operational",
    active: true,
    quantity: 12,
    available: 8,
    total: 12
  }
];

const mockReports = [
  // August 2026
  {
    requestId: "SS-2026-AUG-FL01",
    name: "Tsering Dorjee",
    phone: "+91 98210 11001",
    type: "Flood",
    emergencyType: "Flood",
    location: "Kullu Valley, Himachal Pradesh",
    severity: "critical",
    peopleAffected: "65",
    injuries: "2 treated for injuries",
    description: "Beas river flash flood submerged riverside market and low-lying residential clusters.",
    status: "Resolved",
    createdAt: new Date("2026-08-08T07:20:00Z"),
    updatedAt: new Date("2026-08-14T18:00:00Z")
  },
  {
    requestId: "SS-2026-AUG-LS02",
    name: "Mohan Lal Joshi",
    phone: "+91 94120 22002",
    type: "Landslide",
    emergencyType: "Landslide",
    location: "Rudraprayag Highway KM-42, Uttarakhand",
    severity: "high",
    peopleAffected: "40",
    injuries: "None",
    description: "Heavy cloudburst caused boulders and muck on national highway blocking passenger vehicles.",
    status: "Resolved",
    createdAt: new Date("2026-08-16T12:45:00Z"),
    updatedAt: new Date("2026-08-19T14:00:00Z")
  },
  // September 2026 (Previous month)
  {
    requestId: "SS-2026-SEP-FL01",
    name: "Arunav Borah",
    phone: "+91 98765 43210",
    type: "Flood",
    emergencyType: "Flood",
    location: "Majuli Island, Kamrup, Assam",
    severity: "critical",
    peopleAffected: "95",
    injuries: "3 treated for hypothermia",
    description: "Brahmaputra overflowed embankments; flood waters entered 25 homes in village ward 4.",
    status: "Resolved",
    createdAt: new Date("2026-09-04T06:30:00Z"),
    updatedAt: new Date("2026-09-12T17:00:00Z")
  },
  {
    requestId: "SS-2026-SEP-LS02",
    name: "Meena Negi",
    phone: "+91 98971 65432",
    type: "Landslide",
    emergencyType: "Landslide",
    location: "Joshimath Badrinath Road, Uttarakhand",
    severity: "high",
    peopleAffected: "55",
    injuries: "None",
    description: "Slope subsidence along NH-58. Heavy mudflow cut off road connection between Helang and Joshimath.",
    status: "Resolved",
    createdAt: new Date("2026-09-11T14:00:00Z"),
    updatedAt: new Date("2026-09-16T11:00:00Z")
  },
  {
    requestId: "SS-2026-SEP-CY04",
    name: "Pradeep Jena",
    phone: "+91 94370 12345",
    type: "Cyclone",
    emergencyType: "Cyclone",
    location: "Puri Coastal Colony, Odisha",
    severity: "high",
    peopleAffected: "110",
    injuries: "None",
    description: "Gale winds up to 95 km/h tore tin roofs and uprooted 14 electricity poles along coastal road.",
    status: "Resolved",
    createdAt: new Date("2026-09-21T08:00:00Z"),
    updatedAt: new Date("2026-09-27T16:00:00Z")
  },
  // October 2026 (Previous month)
  {
    requestId: "SS-2026-OCT-FL01",
    name: "Nilratan Mandal",
    phone: "+91 94340 77007",
    type: "Flood",
    emergencyType: "Flood",
    location: "Sundarbans Coastal Basin, West Bengal",
    severity: "critical",
    peopleAffected: "85",
    injuries: "None",
    description: "Spring high-tide breached earthen dyke; brackish water submerged paddy fields and drinking water ponds.",
    status: "Verified",
    createdAt: new Date("2026-10-06T05:40:00Z"),
    updatedAt: new Date("2026-10-15T12:00:00Z")
  },
  {
    requestId: "SS-2026-OCT-CY02",
    name: "Subrat Mohanty",
    phone: "+91 94380 88008",
    type: "Cyclone",
    emergencyType: "Cyclone",
    location: "Gopalpur Port Road, Ganjam, Odisha",
    severity: "high",
    peopleAffected: "140",
    injuries: "3 minor",
    description: "Deep depression winds caused tree falls and snapped power supply lines across 6 villages.",
    status: "Verified",
    createdAt: new Date("2026-10-12T11:15:00Z"),
    updatedAt: new Date("2026-10-18T16:30:00Z")
  },
  // November 2026 (Current month active)
  {
    requestId: "SS-2026-NOV-FL01",
    name: "Kishore Sangma",
    phone: "+91 94360 45678",
    type: "Flood",
    emergencyType: "Flood",
    location: "Dhubri Riverbank, Assam",
    severity: "high",
    peopleAffected: "60",
    injuries: "None",
    description: "Sudden discharge from upstream reservoirs flooded 12 vegetable farms and 8 houses.",
    status: "Verified",
    createdAt: new Date("2026-11-18T08:30:00Z"),
    updatedAt: new Date("2026-11-20T11:00:00Z")
  },
  {
    requestId: "SS-2026-NOV-FR03",
    name: "Vikramjit Singh",
    phone: "+91 98140 78901",
    type: "Fire",
    emergencyType: "Fire",
    location: "Industrial Focal Point, Ludhiana, Punjab",
    severity: "high",
    peopleAffected: "50",
    injuries: "3 treated for burns",
    description: "Textile recycling facility fire. Nearby community center opened for displaced families.",
    status: "Verified",
    createdAt: new Date("2026-11-23T16:15:00Z"),
    updatedAt: new Date("2026-11-24T06:00:00Z")
  }
];

const mockHelpRequests = [
  // August 2026
  {
    requestId: "SS-2026-AUG-HLP01",
    name: "Gita Devi",
    location: "Manali Campsite, Himachal Pradesh",
    helpTypes: "Food, Shelter",
    people: "8",
    urgency: "High",
    details: "Family stranded after riverside tent campsite washed away. Blankets and hot meals needed.",
    status: "Resolved",
    createdAt: new Date("2026-08-09T10:00:00Z"),
    updatedAt: new Date("2026-08-14T15:00:00Z")
  },
  // September 2026 (Previous month)
  {
    requestId: "SS-2026-SEP-HLP01",
    name: "Sunita Devi",
    location: "Silchar Ward 3, Assam",
    helpTypes: "Food, Clean Water, Medicines",
    people: "6",
    urgency: "High",
    details: "Stranded on second floor due to waterlogging. Diabetics medicine needed urgently.",
    status: "Resolved",
    createdAt: new Date("2026-09-05T08:00:00Z"),
    updatedAt: new Date("2026-09-08T18:00:00Z")
  },
  {
    requestId: "SS-2026-SEP-HLP02",
    name: "Kailash Mishra",
    location: "Gopalpur Beach Road, Odisha",
    helpTypes: "Shelter, Tarpaulin",
    people: "4",
    urgency: "High",
    details: "Thatch roof blown away in pre-cyclonic squalls. Tarpaulin waterproof sheet requested.",
    status: "Resolved",
    createdAt: new Date("2026-09-22T09:40:00Z"),
    updatedAt: new Date("2026-09-25T14:30:00Z")
  },
  // October 2026 (Previous month)
  {
    requestId: "SS-2026-OCT-HLP01",
    name: "Debabrata Mondal",
    location: "Gosaba, Sundarbans, West Bengal",
    helpTypes: "Water, Food",
    people: "15",
    urgency: "High",
    details: "Saline water inundated local tubewells. 20L potable drinking water cans required.",
    status: "Resolved",
    createdAt: new Date("2026-10-07T07:15:00Z"),
    updatedAt: new Date("2026-10-11T16:00:00Z")
  },
  {
    requestId: "SS-2026-OCT-HLP03",
    name: "Mohan Reddy",
    location: "Visakhapatnam Suburbs, Andhra Pradesh",
    helpTypes: "Medical Aid",
    people: "5",
    urgency: "High",
    details: "Elderly person needs cardiac prescription refills during road blockade.",
    status: "Resolved",
    createdAt: new Date("2026-10-25T14:10:00Z"),
    updatedAt: new Date("2026-10-27T10:00:00Z")
  },
  // November 2026 (Current month active)
  {
    requestId: "SS-2026-NOV-HLP01",
    name: "Binod Hazarika",
    location: "Majuli Ghat, Assam",
    helpTypes: "Food, Water",
    people: "7",
    urgency: "High",
    details: "Ferry services halted. Drinking water and 5-day dry ration kits needed.",
    status: "NGO Assigned",
    createdAt: new Date("2026-11-19T09:00:00Z"),
    updatedAt: new Date("2026-11-20T14:00:00Z")
  },
  {
    requestId: "SS-2026-NOV-HLP02",
    name: "Fatima Bi",
    location: "Old Hubli Ward 6, Karnataka",
    helpTypes: "Shelter, Blanket",
    people: "4",
    urgency: "Moderate",
    details: "Roof repair tarp and winter blankets for children requested.",
    status: "In Review",
    createdAt: new Date("2026-11-22T11:20:00Z"),
    updatedAt: new Date("2026-11-22T11:20:00Z")
  }
];

const mockVolunteers = [
  {
    name: "Rohan Sengupta",
    phone: "+91 98301 23456",
    email: "rohan.volunteer@example.com",
    location: "Kolkata / Odisha Border",
    skills: "First Aid, Logistics, 4x4 Driving",
    availability: "Immediate / Full-time",
    createdAt: new Date("2026-11-23T10:00:00Z")
  },
  {
    name: "Pooja Sharma",
    phone: "+91 97112 34567",
    email: "pooja.med@example.com",
    location: "Guwahati, Assam",
    skills: "Nursing, Triage, Medical Supply Dispatch",
    availability: "Weekends & On-Call",
    createdAt: new Date("2026-11-24T06:00:00Z")
  },
  {
    name: "Deepak Sen",
    phone: "+91 98311 55667",
    email: "deepak.sen@volunteer.org",
    location: "Bhubaneswar, Odisha",
    skills: "Search & Rescue, First Aid, Boat Operations",
    availability: "Immediate / Full-time",
    createdAt: new Date("2026-09-14T14:20:00Z")
  },
  {
    name: "Tariq Ahmad",
    phone: "+91 94190 33445",
    email: "tariq.ahmad@disastercare.in",
    location: "Srinagar / Jammu",
    skills: "Winter Logistics, Heavy 4x4 Driving, HAM Radio",
    availability: "Full-time",
    createdAt: new Date("2026-10-05T09:30:00Z")
  }
];

const mockCamps = [
  {
    name: "Kamrup Central Flood Shelter & Relief Hub",
    location: "Guwahati Indoor Stadium Complex, Assam",
    capacity: 650,
    occupancy: 420,
    disasterType: "Flood",
    status: "Active",
    createdAt: new Date("2026-09-06T08:00:00Z")
  },
  {
    name: "Puri Cyclone Multi-Purpose Shelter",
    location: "Brahmagiri Cyclone Shelter, Puri, Odisha",
    capacity: 1000,
    occupancy: 680,
    disasterType: "Cyclone",
    status: "Active",
    createdAt: new Date("2026-09-22T10:00:00Z")
  },
  {
    name: "Chamoli Mountain Transit Relief Camp",
    location: "Joshimath High School Grounds, Uttarakhand",
    capacity: 400,
    occupancy: 210,
    disasterType: "Landslide",
    status: "Active",
    createdAt: new Date("2026-10-14T09:00:00Z")
  },
  {
    name: "Bihar Kosi Basin Community Relief Shelter",
    location: "Saharsa Polytechnic Institute, Bihar",
    capacity: 800,
    occupancy: 530,
    disasterType: "Flood",
    status: "Active",
    createdAt: new Date("2026-10-18T11:00:00Z")
  }
];

module.exports = {
  mockAlerts,
  mockNgos,
  mockReliefResources,
  mockReports,
  mockHelpRequests,
  mockVolunteers,
  mockCamps
};
