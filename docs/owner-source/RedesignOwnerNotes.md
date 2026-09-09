# AAAAT Clean Redesign

AAAAT is a simple and convenient tool to generate artifacts and track applications while making easy to retrieve that information. Must be accessible to any user without high tech knowledge and allowing wide AI tools interaction.

## Functions

### Manual Input
- All AAAAT features should be accessible by a human without dealing with json, files or other patches rather than a professional unified UX. 
- Despite previous point, users don't like to write too much so users lazy to write large inputs should be able to use the app without dealing with a lot of empty fields, noise or feeling it uncomplete.

### AAAAT-AI driven Input
- AAAAT might be used as a main entry point, it means that all is managed by AAAAT UX until it is asked for an AI driven feature where it will invoque the already installed AI bridge.
- That way needs to be clear enough, if it is not reliable with some AI configurations it shouldnt appear to avoid confusion


### AI-AAAAT driven Input
- Some functions might be abailable to be managed or triggered from the AI tool itself.
- AAAAT should provide needed harness using wide range of compatible tools/protocols/skills/plugins to guarantee unified AAAAT UX
- Depending on AI app it could communicate directly with AAAAT endpoints, generate files to be saved on known paths or offer copy-paste mechanism as last preferred option.

### installer.ai
- Accessible by UI or from AI tool accessing to the repo or receiving the installer.ai text file as a harness.
- from previous attempts emerges the need of a guided installation system due to the broad AI tools existing and the need to install LaTeX and other dependencies that goes far from traditional fix installers. 
- Usual/known installation options might be predefined and the AI guide should receive enough harness to properly guide user through them. 
- installer might work comp'letely without ai too just with an UI and selecting the proper options (same harness used by agents might be the source of the installation UI, same that the rest of the UI texts and suggestions should work bothways as a literal UI content source and as an agentic harness)
- Installer should at first:
	- install basic app dependencies and required software
	- explain and guide user to install LaTeX (or autonomous install of recommended options that is MiKTeX) if required.
	- configuration for one or more AI bridges/connectors and create the dedicated infrastructure ( for example scripts to launch local apps or skills/agents/whatever protocol for the specific AI provider the user chooses) so once the user specifies it AI tool, if this have wellknown utilities we would create the needed artifacts to guarantee proper UX within this AI and AAAAT. That configurations are not unique and could coexist various and the user choose for each task wich to use.
- Later configuration:
		- an option to setup the tex shared preamble, aknowledge needed data or what data to include and render the first general CV and a cover letter test.
		- allows to add alternative configurations or edit previous configs, also to import/export configs

### VCVGenerator 

VCVG is an applet inside AAAAT dedicated to:

- Generate CVs from shared tex preamble + specific for current CV data .
- CVs and CoverLetters content should allow multilanguage natively. Grant it by using modern LaTeX properties. Eval if is convenient to instead of using a shared preamble creating a dedicated package or document for AAAAT/VCVG
- Generate Cover Letters from shared tex preamble + specific for current CV data (see https://github.com/DidacLL/AgenticCareerBoost)
- Allow to generate the cover letter + CV in a single document.
- Show clearly all paths where jsons, tex and output artifacts are saved. Allow to easily copy and edit them. 
- Show clearly all data fields in use for CV/Cover letters. Allows to edit/hide any field. Hide means to encode it or replace with fake data to hide from AI, that replacement should be done just before rendering to avoid most AI tools to read real data (wont be able to hide it from agents with shell or screen access) 
- CV related data could differ from the main AAAAT data (dedicated CVs that do not use same focus as current worksearch for example) anyway the UI should offer an ease way to fill each field with standard AAAAT data or not.
- All connectors and properties of AAAAT applies to VCVG.


## Use cases
- User opens AAAAT because he wants to manually and quickly edit and render a new CV/cover letter.
- User opens AAAAT, pastes a job offer and wants to receive an analysi of adecuation and convenience, trust of the company etc.. + the option to create a specific CV/cover letter. It also offers to record it as an applied candidacy into AAAAT tracker DB.
- User pastes a job offer on his linked AI tool, it makes the analysis and offers to create a convenient CV or use a previously created one (AAAAT Keeps track and comunicates existing ones tags) and to write a cover letter. Cover letters and cv content should be easily readable and editable before rendering.  It also offers to record it as an applied candidacy into AAAAT tracker DB and executes its best way to achieve it (direct shell access could use commands/API, MCP connector, generating a text/json/whatever is best file to put in a known path or the worst escenario: a text to copy and paste in AAAAT UI)
- User wants to fully review and edit his tracked candidatures and save changes from the AAAAT UI.
- User wants to obtain a resume or filter candidatures using AI after aknowledging the privacy effects of sharing with external providers that bunch of profilable data, once accepted it still could have hidden encoded data
- User opens AAAAT UI to obtain a fast, logic and visual way to navigate its candidacies and see most relevant information about it to quickly have a handy resume of what the job is about, what are the required concepts (tags and definitions etc..) to excel during a call with the recruiters or any kind of assessment. Without having unnecessary information and only the valuable during a live meeting.
- User wants to register a candidacy and to propagate al related information, update tags and definitions shared through all candidacies
- User wants to export its configuration to other device easily and in a secure way to not lose all his data.

