import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class LookupDropdownConstructor implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _dropdown: HTMLSelectElement;
    private _targetEntity: string;
    private _entityId : string;
    private _notifyOutputChanged: () => void;

    constructor() {}

    // =====================================================================================================
    // Standard control methods
    // The init method is called when the control is first loaded on the form
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        try {

            this._context = context;
            this._container = container;
            this._notifyOutputChanged = notifyOutputChanged;
            this._targetEntity = this._context.parameters.dynamicLookup.getTargetEntityType();
            
            console.log("Target entity:", this._targetEntity); // crff8_course
        
            this.initializeAsync();
        
            // Create UI elements
            this._dropdown = document.createElement("select");
            this._dropdown.classList.add("dropdown-select");
            this._container.appendChild(this._dropdown);

        } catch (error) {
            console.error("Error initializing control:", error);
            throw error;
        }
    }

    private async initializeAsync(): Promise<void> {
        try {
            // Get ID field name
            this._entityId = await this.getEntityIdFieldName();
            console.log("ID field name:", this._entityId);
    
            // Populate records (after we have _entityId)
            await this.populateRecords();
    
            // Add event listener only after population
            this._dropdown.addEventListener("change", this.onDropdownChange.bind(this));
        } catch (error) {
            console.error("Initialization failed:", error);
        }
    }
    
    private async getEntityIdFieldName(): Promise<string> {
        try {
            const metadata = await this._context.utils.getEntityMetadata(this._targetEntity);
            return metadata.PrimaryIdAttribute;
        } catch (error) {
            console.error("Using fallback ID field name");
            return `${this._targetEntity}id`; // Fallback to entitynameid
        }
    }

    // =====================================================================================================
    // Fetch records using Web API and populate the dropdown
    private async populateRecords(): Promise<void> {
        try {

            // Fetch records using Web API
            const records = await this.fetchRecords();

            // Populate the dropdown with records
            records.forEach(record => {
                this._dropdown.options.add(new Option(record.name, record.id));
            });

            // Set the selected value if the Lookup Field already has a value (editing scenario)
            const lookupValue = this._context.parameters.dynamicLookup.raw;
            if (lookupValue && lookupValue.length > 0) {
                this._dropdown.value = lookupValue[0].id;
            }

        } catch (error) {

            console.error("Error populating records:", error);
            // Optionally, show a user-friendly error message
            alert("Failed to load records. Please try again later.");

        }
    }

    // =====================================================================================================
    // Fetch records using Web API
    private async fetchRecords(): Promise<{ id: string, name: string }[]> {

        try {

            const entityName = this._targetEntity;
            const retrieveId = this._entityId;
            const retrieveName = this._context.parameters.displayValue.raw ? this._context.parameters.displayValue.raw : "accountnumber";

            // Fetch records using Web API
            const result = await this._context.webAPI.retrieveMultipleRecords(entityName, `?$select=${retrieveId},${retrieveName}&$orderby=${retrieveName} asc`);

            // Map the records to a simpler structure
            return result.entities.map((record: object) => {
                const typedRecord = record as Record<string, string>; 

                // Return the ID and Name fields
                return {
                    id: typedRecord[retrieveId],
                    name: typedRecord[retrieveName]
                };
            });
        } catch (error) {
            console.error("Error fetching records:", error);
            throw "errorFetch";
        }
    }

    // =====================================================================================================
    // Handle the dropdown change event
    private onDropdownChange(): void {

        // Get the selected value and text
        const selectedValue = this._dropdown.value;
        const selectedText = this._dropdown.options[this._dropdown.selectedIndex].text;

        const entityName = this._targetEntity;
        const currentLookupValue = this._context.parameters.dynamicLookup.raw;

        // Check if the value is actually changing
        if (!currentLookupValue || currentLookupValue.length === 0 || currentLookupValue[0].id !== selectedValue) {
            // Update the Lookup Field value
            this._context.parameters.dynamicLookup.raw = [{
                id: selectedValue,
                name: selectedText,
                entityType: entityName
            }];
            // Notify the framework that the output has changed
            this._notifyOutputChanged();
        } else {
            console.log("No change detected. Skipping update.");
        }
    }

    // =====================================================================================================
    // =====================================================================================================
    // Standard control methods
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Update the dropdown if the Lookup Field changes
        const lookupValue = context.parameters.dynamicLookup.raw;
        if (lookupValue && lookupValue.length > 0) {
            this._dropdown.value = lookupValue[0].id;
        }
    }

    public getOutputs(): IOutputs {
        return {
            dynamicLookup: this._context.parameters.dynamicLookup.raw // Return updated value
        };
    }

    public destroy(): void {
        // Add code to clean up control if necessary
    }
}
